"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { thaiMonth } from "@/lib/period";
import { itemMonthScore } from "@/lib/evaluation";
import { fmt } from "@/lib/kpi";
import type { EvalItem, EvalScore } from "@/lib/types";

export default function EvalScoreEntry({
  items, scores, months, canEdit, onChanged,
}: { items: EvalItem[]; scores: EvalScore[]; months: string[]; canEdit: boolean; onChanged: () => void }) {
  const active = items.filter((i) => i.active);
  const [month, setMonth] = useState(months[Math.min(new Date().getMonth(), 11)]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const v: Record<string, string> = {};
    active.forEach((it) => {
      const sc = scores.find((s) => s.item_id === it.id && s.month === month);
      const x = it.kind === "rating" ? sc?.rating : sc?.actual;
      v[it.id] = x == null ? "" : String(x);
    });
    setVals(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, scores, items]);

  async function save() {
    setMsg(null);
    const sb = getSupabase();
    for (const it of active) {
      const raw = vals[it.id]?.trim() ?? "";
      const existing = scores.find((s) => s.item_id === it.id && s.month === month);
      if (raw === "") {
        if (existing) await sb.from("eval_scores").delete().eq("id", existing.id);
        continue;
      }
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || (it.kind === "rating" && (n < 1 || n > 5))) {
        return setMsg(`ค่าของ "${it.name}" ไม่ถูกต้อง`);
      }
      const row = { item_id: it.id, month, actual: it.kind === "target" ? n : null, rating: it.kind === "rating" ? n : null };
      const { error } = await sb.from("eval_scores").upsert(row, { onConflict: "item_id,month" });
      if (error) return setMsg(error.message);
    }
    setMsg("บันทึกแล้ว");
    onChanged();
  }

  if (!active.length) return <p className="text-sm text-slate-400">ยังไม่มีหัวข้อที่ใช้งาน</p>;
  return (
    <div className="space-y-3">
      <select className="input w-48" value={month} onChange={(e) => setMonth(e.target.value)}>
        {months.map((m) => <option key={m} value={m}>{thaiMonth(m)}</option>)}
      </select>
      <div className="space-y-2">
        {active.map((it) => {
          const n = vals[it.id] === "" || vals[it.id] == null ? null : Number(vals[it.id]);
          const prev = n == null ? null : itemMonthScore(it, { id: "", item_id: it.id, month, actual: it.kind === "target" ? n : null, rating: it.kind === "rating" ? n : null, note: null });
          return (
            <div key={it.id} className="flex items-center gap-3">
              <div className="flex-1 text-sm">{it.name}
                <span className="ml-2 text-xs text-slate-400">{it.kind === "rating" ? "1–5" : `เป้า ${it.target}${it.unit ? " " + it.unit : ""}`}</span>
              </div>
              <input className="input w-28" type="number" disabled={!canEdit} value={vals[it.id] ?? ""} onChange={(e) => setVals({ ...vals, [it.id]: e.target.value })} />
              <span className="w-16 text-right text-xs text-slate-500">{prev == null ? "–" : `${fmt(prev, 0)} คะแนน`}</span>
            </div>
          );
        })}
      </div>
      {canEdit && <button className="btn" onClick={save}>บันทึกคะแนนเดือนนี้</button>}
      {msg && <span className="ml-3 text-sm text-slate-600">{msg}</span>}
    </div>
  );
}
