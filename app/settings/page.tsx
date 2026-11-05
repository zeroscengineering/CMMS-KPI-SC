"use client";
import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Card, ErrorBox, YearSelect, Loading } from "@/components/ui";
import EngineerManager from "@/components/EngineerManager";
import { currentYear, yearLabel } from "@/lib/period";
import { getSupabase } from "@/lib/supabase";
import { useYearData, useRole } from "@/lib/useYearData";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [fy, setFy] = useState(currentYear());
  const { settings, engineers, loading, error, reload } = useYearData(fy);
  const { isAdmin, role } = useRole();

  const [s, setS] = useState<Settings>(settings);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => setS(settings), [settings]);

  const weightSum = s.weight_error + s.weight_ftf + s.weight_pm + s.weight_complaint;

  const numField = (label: string, k: keyof Settings, step = "1") => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type="number"
        step={step}
        disabled={!isAdmin}
        value={Number(s[k])}
        onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })}
      />
    </div>
  );

  async function saveSettings() {
    setMsg(null);
    if (weightSum !== 100) return setMsg({ ok: false, text: `น้ำหนักรวมต้องเท่ากับ 100% (ตอนนี้ ${weightSum}%)` });
    const { error: err } = await getSupabase().from("kpi_settings").upsert({ ...s, year: fy });
    if (err) return setMsg({ ok: false, text: err.code === "42501" ? "เฉพาะ admin เท่านั้นที่แก้ไขได้" : err.message });
    setMsg({ ok: true, text: "บันทึกการตั้งค่าแล้ว" });
    reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">ตั้งค่า</h1>
          <p className="text-xs text-slate-500">{yearLabel(fy)} · สิทธิ์ของคุณ: {role ?? "…"}</p>
        </div>
        <YearSelect value={fy} onChange={setFy} />
      </div>
      {error && <ErrorBox message={error} />}
      {!isAdmin && role && <p className="text-sm text-amber-700">เฉพาะ admin เท่านั้นที่แก้ไขการตั้งค่าและรายชื่อทีมได้</p>}
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-rose-600"}`}>{msg.text}</p>}

      {loading ? <Loading /> : (
        <>
          <Card title={`พนักงานและ Job Description (${engineers.length} คน) — ใช้ร่วมกันทุกปี`}>
            <EngineerManager engineers={engineers} isAdmin={isAdmin} reload={reload} onMessage={setMsg} />
          </Card>

          <Card title={`น้ำหนัก KPI (รวม 100%) และเป้าหมาย — ${yearLabel(fy)}`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {numField("KPI1 ความผิดพลาดหน้างาน (%)", "weight_error")}
              {numField("KPI2 First-Time Fix (%)", "weight_ftf")}
              {numField("KPI3 PM ตามแผน (%)", "weight_pm")}
              {numField("KPI4 ข้อร้องเรียน (%)", "weight_complaint")}
            </div>
            <p className={`mt-2 text-sm ${weightSum === 100 ? "text-emerald-700" : "text-rose-600"}`}>น้ำหนักรวม: {weightSum}%</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {numField("เป้าหมาย FTF (%)", "target_ftf", "0.1")}
              {numField("เป้าหมาย PM ตามแผน (%)", "target_pm", "0.1")}
              {numField("PM ล่าช้าได้ไม่เกิน (วัน)", "pm_grace_days")}
              {numField("สัดส่วนคะแนนส่วนผลงาน (%)", "performance_share")}
            </div>
          </Card>

          <Card title="เกณฑ์การให้คะแนน (สมมติฐาน — ปรับให้ตรงกับเอกสารเกณฑ์ของบริษัท)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {numField("KPI1: หักคะแนนต่อความผิดพลาด 1 ครั้ง", "error_penalty")}
              {numField("KPI4: หัก/ครั้ง — ไม่เกิดความเสียหาย", "complaint_penalty_l1")}
              {numField("KPI4: หัก/ครั้ง — เสียหายทรัพย์สิน/ปลอดภัย", "complaint_penalty_l2")}
              {numField("KPI4: หัก/ครั้ง — ส่งผลกระทบกับบริษัท", "complaint_penalty_l3")}
            </div>
          </Card>

          <Card title="เกณฑ์เกรด (คะแนนรวมขั้นต่ำ)">
            <div className="space-y-2">
              {s.grade_thresholds.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="input !w-24" disabled={!isAdmin} value={g.grade}
                    onChange={(e) => setS({ ...s, grade_thresholds: s.grade_thresholds.map((x, j) => (j === i ? { ...x, grade: e.target.value } : x)) })} />
                  <span className="text-sm">≥</span>
                  <input className="input !w-24" type="number" disabled={!isAdmin} value={g.min}
                    onChange={(e) => setS({ ...s, grade_thresholds: s.grade_thresholds.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)) })} />
                  {isAdmin && (
                    <button className="btn-ghost !px-2 text-rose-600"
                      onClick={() => setS({ ...s, grade_thresholds: s.grade_thresholds.filter((_, j) => j !== i) })}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {isAdmin && (
                <button className="btn-ghost" onClick={() => setS({ ...s, grade_thresholds: [...s.grade_thresholds, { grade: "?", min: 0 }] })}>
                  <Plus size={14} /> เพิ่มเกรด
                </button>
              )}
            </div>
            {isAdmin && (
              <button className="btn mt-4" onClick={saveSettings}><Save size={16} /> บันทึกการตั้งค่า</button>
            )}
          </Card>

        </>
      )}
    </div>
  );
}
