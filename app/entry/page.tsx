"use client";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { Card, ErrorBox, FiscalYearSelect, GradeBadge, Loading } from "@/components/ui";
import { currentFiscalYear, fiscalMonths, thaiMonth } from "@/lib/fiscal";
import { getSupabase } from "@/lib/supabase";
import { useFiscalData, useRole } from "@/lib/useFiscalData";
import { complaintTotal, fmt, ftfPct, pmPct, scoreTotals, sumLogs } from "@/lib/kpi";
import type { MonthlyLog } from "@/lib/types";

type Form = {
  month: string;
  engineer_id: string;
  err_count: string;
  err_damage: string;
  total_cases: string;
  repeat_cases: string;
  pm_assigned: string;
  pm_on_plan: string;
  complaint_l1: string;
  complaint_l2: string;
  complaint_l3: string;
  note: string;
};

const blank = (month = "", engineer_id = ""): Form => ({
  month, engineer_id,
  err_count: "0", err_damage: "0", total_cases: "0", repeat_cases: "0",
  pm_assigned: "0", pm_on_plan: "0", complaint_l1: "0", complaint_l2: "0", complaint_l3: "0", note: "",
});

const n = (v: string) => (v.trim() === "" ? 0 : Number(v));

export default function EntryPage() {
  const [fy, setFy] = useState(currentFiscalYear());
  const { settings, engineers, logs, loading, error, reload } = useFiscalData(fy);
  const { canEdit } = useRole();
  const months = useMemo(() => fiscalMonths(fy), [fy]);

  const [form, setForm] = useState<Form>(blank());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filterMonth, setFilterMonth] = useState("");

  const active = engineers.filter((e) => e.active);

  // ตั้งค่าเริ่มต้นของเดือน = เดือนปัจจุบัน (ถ้าอยู่ในปีงบประมาณ) ไม่เช่นนั้นเดือนแรก
  useEffect(() => {
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    setForm((f) => ({ ...f, month: months.includes(cur) ? cur : months[0] }));
    setEditingId(null);
  }, [months]);

  const nameOf = (id: string) => engineers.find((e) => e.id === id)?.full_name ?? "?";

  const num = {
    err_count: n(form.err_count), err_damage: n(form.err_damage),
    total_cases: n(form.total_cases), repeat_cases: n(form.repeat_cases),
    pm_assigned: n(form.pm_assigned), pm_on_plan: n(form.pm_on_plan),
    complaint_l1: n(form.complaint_l1), complaint_l2: n(form.complaint_l2), complaint_l3: n(form.complaint_l3),
  };

  const preview = useMemo(() => {
    const t = sumLogs([num]);
    return { t, ...scoreTotals(t, settings, true) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, settings]);

  // ---------- Validation ----------
  const duplicate = logs.find(
    (l) => l.engineer_id === form.engineer_id && l.month === form.month && l.id !== editingId
  );
  const errors: string[] = [];
  if (!form.engineer_id) errors.push("กรุณาเลือกชื่อวิศวกร/ช่าง");
  if (duplicate) errors.push(`มีบันทึกของ ${nameOf(form.engineer_id)} ในเดือน ${thaiMonth(form.month)} แล้ว (กดแก้ไขที่ตารางด้านล่างแทน)`);
  if (Object.values(num).some((v) => Number.isNaN(v) || v < 0)) errors.push("ตัวเลขต้องไม่ติดลบ");
  if (num.repeat_cases > num.total_cases) errors.push("เคสแก้ซ้ำต้องไม่เกินเคสทั้งหมด");
  if (num.pm_on_plan > num.pm_assigned) errors.push("PM ทำครบตรงแผนต้องไม่เกิน PM ที่ได้รับมอบหมาย");
  if (num.err_count === 0 && num.err_damage > 0) errors.push("มีมูลค่าความเสียหาย แต่จำนวนความผิดพลาดเป็น 0 ครั้ง");

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (errors.length) return;
    setBusy(true);
    setMsg(null);
    const sb = getSupabase();
    const payload = { engineer_id: form.engineer_id, month: form.month, ...num, note: form.note || null };
    const { error: err } = editingId
      ? await sb.from("monthly_kpi_logs").update(payload).eq("id", editingId)
      : await sb.from("monthly_kpi_logs").insert(payload);
    setBusy(false);
    if (err) {
      setMsg({
        ok: false,
        text: err.code === "23505" ? "มีบันทึกของคนนี้ในเดือนนี้แล้ว" : err.code === "42501" ? "คุณไม่มีสิทธิ์บันทึกข้อมูล (ต้องเป็น admin/editor)" : err.message,
      });
      return;
    }
    setMsg({ ok: true, text: editingId ? "แก้ไขข้อมูลแล้ว" : "บันทึกข้อมูลแล้ว" });
    setEditingId(null);
    setForm(blank(form.month, ""));
    reload();
  }

  function edit(l: MonthlyLog) {
    setEditingId(l.id);
    setForm({
      month: l.month, engineer_id: l.engineer_id,
      err_count: String(l.err_count), err_damage: String(l.err_damage),
      total_cases: String(l.total_cases), repeat_cases: String(l.repeat_cases),
      pm_assigned: String(l.pm_assigned), pm_on_plan: String(l.pm_on_plan),
      complaint_l1: String(l.complaint_l1), complaint_l2: String(l.complaint_l2), complaint_l3: String(l.complaint_l3),
      note: l.note ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(l: MonthlyLog) {
    if (!confirm(`ลบบันทึกของ ${nameOf(l.engineer_id)} เดือน ${thaiMonth(l.month)} ?`)) return;
    const { error: err } = await getSupabase().from("monthly_kpi_logs").delete().eq("id", l.id);
    if (err) setMsg({ ok: false, text: err.message });
    else reload();
  }

  const field = (label: string, k: keyof Form, step = "1") => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type="number" min={0} step={step} inputMode="decimal" value={form[k]} onChange={set(k)} onFocus={(e) => e.target.select()} />
    </div>
  );

  const shown = logs
    .filter((l) => !filterMonth || l.month === filterMonth)
    .sort((a, b) => b.month.localeCompare(a.month) || nameOf(a.engineer_id).localeCompare(nameOf(b.engineer_id)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">บันทึกรายเดือน (1 แถว = 1 คน × 1 เดือน)</h1>
        <FiscalYearSelect value={fy} onChange={setFy} />
      </div>
      {error && <ErrorBox message={error} />}

      <Card title={editingId ? "แก้ไขบันทึก" : "เพิ่มบันทึกใหม่"}>
        {!canEdit && <p className="mb-3 text-sm text-amber-700">บัญชีของคุณเป็นสิทธิ์ดูอย่างเดียว (viewer) — ให้ admin เปลี่ยนเป็น editor เพื่อบันทึกข้อมูล</p>}
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">เดือน</label>
              <select className="input" value={form.month} onChange={set("month")}>
                {months.map((m) => <option key={m} value={m}>{thaiMonth(m)}</option>)}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="label">ชื่อวิศวกร / ช่าง</label>
              <select className="input" value={form.engineer_id} onChange={set("engineer_id")}>
                <option value="">— เลือก —</option>
                {active.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.position})</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-xs font-semibold text-brand-700">KPI 1 ความผิดพลาดหน้างาน</legend>
              <div className="space-y-2">{field("จำนวนครั้ง", "err_count")}{field("มูลค่าความเสียหาย (บาท)", "err_damage", "0.01")}</div>
            </fieldset>
            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-xs font-semibold text-brand-700">KPI 2 First-Time Fix</legend>
              <div className="space-y-2">{field("เคสทั้งหมด", "total_cases")}{field("เคสที่ต้องกลับไปแก้ซ้ำ", "repeat_cases")}</div>
              <p className="mt-2 text-sm">FTF = <b>{fmt(preview.ftf)}%</b></p>
            </fieldset>
            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-xs font-semibold text-brand-700">KPI 3 PM ตามแผน</legend>
              <div className="space-y-2">{field("PM ที่ได้รับมอบหมาย", "pm_assigned")}{field(`PM ทำครบตรงแผน (ล่าช้า ≤ ${settings.pm_grace_days} วัน)`, "pm_on_plan")}</div>
              <p className="mt-2 text-sm">PM = <b>{fmt(preview.pm)}%</b></p>
            </fieldset>
            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-xs font-semibold text-brand-700">KPI 4 ข้อร้องเรียน</legend>
              <div className="space-y-2">
                {field("ไม่เกิดความเสียหาย", "complaint_l1")}
                {field("เสียหายต่อทรัพย์สิน/ความปลอดภัย", "complaint_l2")}
                {field("ส่งผลกระทบกับบริษัท", "complaint_l3")}
              </div>
            </fieldset>
          </div>

          <div>
            <label className="label">รายละเอียด / หมายเหตุ</label>
            <textarea className="input" rows={2} value={form.note} onChange={set("note")} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
            <span>
              คะแนนเดือนนี้ (ตัวอย่าง): <b>{fmt(preview.total)}</b> / 100 · เกรด <GradeBadge grade={preview.grade} />
            </span>
            <span className="text-xs text-slate-500">
              K1 {fmt(preview.s1, 0)} · K2 {fmt(preview.s2, 0)} · K3 {fmt(preview.s3, 0)} · K4 {fmt(preview.s4, 0)}
            </span>
          </div>

          {errors.length > 0 && form.engineer_id !== "" && (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-rose-600">{errors.map((x) => <li key={x}>{x}</li>)}</ul>
          )}
          {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}

          <div className="flex gap-2">
            <button className="btn" disabled={busy || !canEdit || errors.length > 0}>
              <Save size={16} /> {editingId ? "บันทึกการแก้ไข" : "บันทึก"}
            </button>
            {editingId && (
              <button type="button" className="btn-ghost" onClick={() => { setEditingId(null); setForm(blank(form.month, "")); }}>
                <X size={16} /> ยกเลิก
              </button>
            )}
          </div>
        </form>
      </Card>

      <Card
        title={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>ตารางบันทึกทั้งหมด ({shown.length} รายการ)</span>
            <select className="input !w-auto" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">ทุกเดือน</option>
              {months.map((m) => <option key={m} value={m}>{thaiMonth(m)}</option>)}
            </select>
          </div>
        }
      >
        {loading ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {["เดือน","ชื่อ","ผิดพลาด","เสียหาย (บาท)","เคส","แก้ซ้ำ","FTF %","PM","PM ตรงแผน","PM %","ร้องเรียน","หมายเหตุ",""].map((h) => <th key={h} className="th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => {
                  const t = sumLogs([l]);
                  return (
                    <tr key={l.id} className={l.id === editingId ? "bg-amber-50" : ""}>
                      <td className="td">{thaiMonth(l.month)}</td>
                      <td className="td font-medium">{nameOf(l.engineer_id)}</td>
                      <td className="td">{l.err_count}</td>
                      <td className="td">{fmt(l.err_damage, 0)}</td>
                      <td className="td">{l.total_cases}</td>
                      <td className="td">{l.repeat_cases}</td>
                      <td className="td">{fmt(ftfPct(t))}</td>
                      <td className="td">{l.pm_assigned}</td>
                      <td className="td">{l.pm_on_plan}</td>
                      <td className="td">{fmt(pmPct(t))}</td>
                      <td className="td">{complaintTotal(t)}</td>
                      <td className="td max-w-[220px] truncate" title={l.note ?? ""}>{l.note}</td>
                      <td className="td">
                        {canEdit && (
                          <div className="flex gap-1">
                            <button className="btn-ghost !px-2" onClick={() => edit(l)} title="แก้ไข"><Pencil size={14} /></button>
                            <button className="btn-ghost !px-2 text-rose-600" onClick={() => remove(l)} title="ลบ"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={13}>ยังไม่มีข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
