"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, ErrorBox, GradeBadge, Loading, YearSelect } from "@/components/ui";
import Avatar3D from "@/components/Avatar3D";
import EvalItemsManager from "@/components/EvalItemsManager";
import JdEditor from "@/components/JdEditor";
import EvalScoreEntry from "@/components/EvalScoreEntry";
import { currentYear, thaiMonth, yearLabel, yearMonths } from "@/lib/period";
import { useRole, useYearData } from "@/lib/useYearData";
import { evaluatePerson, monthlySeries } from "@/lib/evaluation";
import { fmt } from "@/lib/kpi";
import { getSupabase } from "@/lib/supabase";

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const [fy, setFy] = useState(currentYear());
  const { settings, engineers, logs, items, scores, loading, error, reload } = useYearData(fy);
  const { canEdit, isAdmin } = useRole();
  const e = engineers.find((x) => x.id === id);
  const months = useMemo(() => yearMonths(fy), [fy]);
  const [w, setW] = useState<Record<string, string> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const ev = useMemo(() => (e ? evaluatePerson(e, logs, items, scores, settings) : null), [e, logs, items, scores, settings]);
  const series = useMemo(
    () => (e ? monthlySeries(e, months, logs, items, scores, settings) : []),
    [e, months, logs, items, scores, settings]
  );
  const myItems = items.filter((i) => i.engineer_id === id);

  const WK = [["w_error", "KPI1 ผิดพลาด"], ["w_ftf", "KPI2 FTF"], ["w_pm", "KPI3 PM"], ["w_complaint", "KPI4 ร้องเรียน"]] as const;
  async function saveWeights() {
    if (!e || !w) return;
    const patch: Record<string, number | null> = {};
    WK.forEach(([k]) => { patch[k] = w[k].trim() === "" ? null : Number(w[k]); });
    const { error: err } = await getSupabase().from("engineers").update(patch).eq("id", e.id);
    setMsg(err ? err.message : "บันทึกน้ำหนักแล้ว");
    if (!err) { setW(null); reload(); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/individual" className="text-sm text-brand-700">← กลับ</Link>
        <YearSelect value={fy} onChange={setFy} />
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? <Loading /> : !e || !ev ? <Card>ไม่พบพนักงาน</Card> : (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar3D name={e.full_name} size={112} />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold">{e.full_name}</h1>
                <div className="text-sm text-slate-500">{e.position || "–"} · {yearLabel(fy)}</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-semibold">{fmt(ev.total)}</div>
                <div className="text-xs text-slate-400">เต็ม 100</div>
                <GradeBadge grade={ev.grade} />
                <div className="mt-1 text-xs text-slate-500">ส่วนผลงาน {fmt(ev.performance)} / {settings.performance_share}</div>
              </div>
            </div>
          </Card>

          <Card title="หน้าที่ความรับผิดชอบ (Job Description)">
            <JdEditor key={e.id + JSON.stringify(e.jd_sections)} engineer={e} canEdit={isAdmin} onChanged={reload} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="เรดาร์: คะแนนแต่ละหัวข้อ (0–100)">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={ev.components.filter((c) => c.weight > 0).map((c) => ({ name: c.short, score: Math.round(c.score ?? 0) }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" fontSize={11} />
                    <PolarRadiusAxis domain={[0, 100]} fontSize={10} />
                    <Radar dataKey="score" stroke="#2e86de" fill="#2e86de" fillOpacity={0.35} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="แนวโน้มคะแนนรวมรายเดือน">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series.map((s) => ({ name: thaiMonth(s.month), คะแนน: s.total == null ? undefined : Math.round(s.total * 10) / 10 }))} margin={{ left: -10, right: 10, top: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="คะแนน" stroke="#10b981" strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card title="รายละเอียดคะแนนตามหัวข้อ">
            <table className="w-full">
              <thead><tr><th className="th">หัวข้อ</th><th className="th">ผลจริง</th><th className="th">คะแนน (0–100)</th><th className="th">น้ำหนัก</th><th className="th">ได้ตามน้ำหนัก</th></tr></thead>
              <tbody>
                {ev.components.map((c) => (
                  <tr key={c.key} className={c.weight === 0 ? "text-slate-300" : ""}>
                    <td className="td">{c.label}{c.kind === "custom" && <span className="ml-1 rounded bg-sky-50 px-1 text-xs text-sky-700">เพิ่มเอง</span>}</td>
                    <td className="td text-xs">{c.detail}</td>
                    <td className="td">{fmt(c.score)}</td>
                    <td className="td">{c.weight === 0 ? "ปิด" : c.weight}</td>
                    <td className="td font-semibold">{fmt(c.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-slate-500">หัวข้อที่ยังไม่มีข้อมูลจะถูกตัดออก และกระจายน้ำหนักที่เหลือให้รวมเป็น 100</p>
          </Card>

          <Card title="น้ำหนัก KPI หลักของคนนี้">
            {w ? (
              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-4">
                  {WK.map(([k, label]) => (
                    <label key={k} className="text-xs">{label}
                      <input className="input mt-1" type="number" placeholder="ใช้ค่าของปี" value={w[k]} onChange={(ev2) => setW({ ...w, [k]: ev2.target.value })} />
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500">เว้นว่าง = ใช้ค่าของปี · ใส่ 0 = ปิด KPI ข้อนั้นสำหรับคนนี้ (ระบบจะปรับน้ำหนักรวมเป็น 100 ให้เอง)</p>
                <button className="btn" onClick={saveWeights}>บันทึก</button>{" "}
                <button className="btn-ghost" onClick={() => setW(null)}>ยกเลิก</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {ev.components.filter((c) => c.kind === "core").map((c) => <span key={c.key}>{c.short}: <b>{c.weight}</b></span>)}
                {isAdmin && (
                  <button className="btn-ghost" onClick={() => setW(Object.fromEntries(WK.map(([k]) => [k, e[k] == null ? "" : String(e[k])])))}>แก้ไขน้ำหนัก</button>
                )}
              </div>
            )}
            {msg && <div className="mt-2 text-sm text-slate-600">{msg}</div>}
          </Card>

          <Card title="หัวข้อประเมินเฉพาะบุคคล (ตามหน้าที่)">
            <EvalItemsManager engineer={e} items={myItems} allItems={items} engineers={engineers} isAdmin={isAdmin} onChanged={reload} />
          </Card>

          <Card title="กรอกคะแนนหัวข้อเพิ่มเติมรายเดือน">
            <EvalScoreEntry items={myItems} scores={scores} months={months} canEdit={canEdit} onChanged={reload} />
          </Card>
        </>
      )}
    </div>
  );
}
