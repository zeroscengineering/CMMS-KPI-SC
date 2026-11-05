"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, ErrorBox, Loading, YearSelect } from "@/components/ui";
import { currentYear, thaiMonth, yearMonths } from "@/lib/period";
import { useRole, useYearData } from "@/lib/useYearData";
import { itemMonthScore } from "@/lib/evaluation";
import { fmt } from "@/lib/kpi";
import { getSupabase } from "@/lib/supabase";

export default function ScoresPage() {
  const [fy, setFy] = useState(currentYear());
  const months = useMemo(() => yearMonths(fy), [fy]);
  const [month, setMonth] = useState(months[Math.min(new Date().getMonth(), 11)]);
  const { engineers, items, scores, loading, error, reload } = useYearData(fy);
  const { canEdit } = useRole();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setMonth(months[Math.min(new Date().getMonth(), 11)]); }, [months]);

  const groups = useMemo(
    () =>
      engineers
        .filter((e) => e.active)
        .map((e) => ({ e, its: items.filter((i) => i.engineer_id === e.id && i.active) }))
        .filter((g) => g.its.length > 0),
    [engineers, items]
  );

  useEffect(() => {
    const v: Record<string, string> = {};
    items.forEach((it) => {
      const sc = scores.find((s) => s.item_id === it.id && s.month === month);
      const x = it.kind === "rating" ? sc?.rating : sc?.actual;
      v[it.id] = x == null ? "" : String(x);
    });
    setVals(v);
  }, [month, items, scores]);

  async function saveAll() {
    setBusy(true); setMsg(null);
    const sb = getSupabase();
    const upserts: object[] = [];
    const deletes: string[] = [];
    for (const g of groups) for (const it of g.its) {
      const raw = (vals[it.id] ?? "").trim();
      const ex = scores.find((s) => s.item_id === it.id && s.month === month);
      if (raw === "") { if (ex) deletes.push(ex.id); continue; }
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || (it.kind === "rating" && (n < 1 || n > 5))) {
        setBusy(false);
        return setMsg(`ค่าไม่ถูกต้อง: ${g.e.full_name} / ${it.name}`);
      }
      upserts.push({ item_id: it.id, month, actual: it.kind === "target" ? n : null, rating: it.kind === "rating" ? n : null });
    }
    if (upserts.length) {
      const { error: e1 } = await sb.from("eval_scores").upsert(upserts, { onConflict: "item_id,month" });
      if (e1) { setBusy(false); return setMsg(e1.message); }
    }
    if (deletes.length) {
      const { error: e2 } = await sb.from("eval_scores").delete().in("id", deletes);
      if (e2) { setBusy(false); return setMsg(e2.message); }
    }
    setBusy(false);
    setMsg(`บันทึกแล้ว ${upserts.length} รายการ`);
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">ให้คะแนนหัวข้อประเมินรายเดือน</h1>
          <p className="text-xs text-slate-500">กรอกทุกคนในหน้าเดียว · KPI หลัก 4 ข้อกรอกที่หน้า “บันทึกรายเดือน”</p>
        </div>
        <div className="flex gap-2">
          <select className="input w-40" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{thaiMonth(m)}</option>)}
          </select>
          <YearSelect value={fy} onChange={setFy} />
        </div>
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? <Loading /> : groups.length === 0 ? (
        <Card>ยังไม่มีหัวข้อประเมินเพิ่มเติม ไปที่ “สรุปรายบุคคล” → เลือกคน → เพิ่มหัวข้อ (หรือสร้างจาก JD)</Card>
      ) : (
        <>
          {groups.map(({ e, its }) => (
            <Card key={e.id} title={<Link href={`/individual/${e.id}`} className="hover:underline">{e.full_name} <span className="font-normal text-slate-400">· {e.position}</span></Link>}>
              <div className="space-y-2">
                {its.map((it) => {
                  const raw = vals[it.id] ?? "";
                  const n = raw === "" ? null : Number(raw);
                  const prev = n == null || Number.isNaN(n) ? null : itemMonthScore(it, { id: "", item_id: it.id, month, actual: it.kind === "target" ? n : null, rating: it.kind === "rating" ? n : null, note: null });
                  return (
                    <div key={it.id} className="flex items-center gap-3">
                      <div className="flex-1 text-sm">{it.name}
                        <span className="ml-2 text-xs text-slate-400">{it.kind === "rating" ? "1–5" : `เป้า ${it.target}${it.unit ? " " + it.unit : ""}`}</span>
                      </div>
                      <input className="input w-28" type="number" disabled={!canEdit} value={raw} onChange={(ev) => setVals({ ...vals, [it.id]: ev.target.value })} />
                      <span className="w-16 text-right text-xs text-slate-500">{prev == null ? "–" : `${fmt(prev, 0)} คะแนน`}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
          {canEdit && (
            <div className="sticky bottom-3 flex items-center gap-3 rounded-xl border bg-white p-3 shadow">
              <button className="btn" disabled={busy} onClick={saveAll}>{busy ? "กำลังบันทึก…" : `บันทึกทั้งหมด (${thaiMonth(month)})`}</button>
              {msg && <span className="text-sm text-slate-600">{msg}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
