"use client";
import { useMemo, useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, ClipboardCheck, ShieldAlert, Wrench } from "lucide-react";
import { Card, ErrorBox, FiscalYearSelect, Loading, StatusBadge } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import { currentFiscalYear, fiscalMonths, thaiMonth } from "@/lib/fiscal";
import { useFiscalData } from "@/lib/useFiscalData";
import { complaintTotal, fmt, ftfPct, kpiPass, pmPct, scoreTotals, sumLogs } from "@/lib/kpi";

export default function DashboardPage() {
  const [fy, setFy] = useState(currentFiscalYear());
  const { settings, engineers, logs, loading, error } = useFiscalData(fy);

  const all = useMemo(() => sumLogs(logs), [logs]);
  const hasData = logs.length > 0;
  const pass = kpiPass(all, settings, hasData);
  const team = scoreTotals(all, settings, hasData);

  const monthly = useMemo(
    () =>
      fiscalMonths(fy).map((m) => {
        const ls = logs.filter((l) => l.month === m);
        const t = sumLogs(ls);
        return { m, label: thaiMonth(m), t, has: ls.length > 0, ftf: ftfPct(t), pm: pmPct(t) };
      }),
    [fy, logs]
  );

  const chartData = monthly.map((r) => ({
    name: r.label,
    "FTF %": r.ftf == null ? undefined : Math.round(r.ftf * 10) / 10,
    "PM ตามแผน %": r.pm == null ? undefined : Math.round(r.pm * 10) / 10,
  }));

  const cards = [
    {
      icon: AlertTriangle,
      title: "KPI 1 ความผิดพลาดหน้างาน",
      weight: settings.weight_error,
      actual: `${all.err_count} ครั้ง / ${fmt(all.err_damage, 0)} บาท`,
      target: "0 ครั้ง / 0 บาท",
      ok: pass.k1,
    },
    {
      icon: Wrench,
      title: "KPI 2 First-Time Fix",
      weight: settings.weight_ftf,
      actual: `${fmt(ftfPct(all))}%`,
      target: `> ${settings.target_ftf}%`,
      ok: pass.k2,
    },
    {
      icon: ClipboardCheck,
      title: "KPI 3 PM ตามแผน",
      weight: settings.weight_pm,
      actual: `${fmt(pmPct(all))}%`,
      target: `≥ ${settings.target_pm}%`,
      ok: pass.k3,
    },
    {
      icon: ShieldAlert,
      title: "KPI 4 ข้อร้องเรียนลูกค้า",
      weight: settings.weight_complaint,
      actual: `${complaintTotal(all)} ครั้ง`,
      target: "0 ครั้ง",
      ok: pass.k4,
    },
  ];

  const passCount = Object.values(pass).filter((v) => v === true).length;
  const known = Object.values(pass).filter((v) => v != null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">สรุปแผนก (สะสมทั้งปีงบประมาณ)</h1>
          <p className="text-xs text-slate-500">ทีมงานที่ใช้งาน {engineers.filter((e) => e.active).length} คน</p>
        </div>
        <FiscalYearSelect value={fy} onChange={setFy} />
      </div>

      {error && <ErrorBox message={error} />}
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, title, weight, actual, target, ok }) => (
              <Card key={title}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Icon size={16} className="text-brand-600" /> {title}
                  </div>
                  <span className="text-xs text-slate-400">น้ำหนัก {weight}%</span>
                </div>
                <div className="mt-3 text-2xl font-semibold">{hasData ? actual : "–"}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>เป้าหมาย {target}</span>
                  <StatusBadge ok={ok} />
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm">
                สถานะภาพรวม:{" "}
                <b>
                  ผ่านเป้า {passCount} / {known} ด้าน
                </b>
                {team.total != null && (
                  <span className="ml-3 text-slate-500">
                    คะแนนรวมทีม {fmt(team.total)} / 100 · เกรด {team.grade}
                  </span>
                )}
              </div>
              <ExportButtons fy={fy} />
            </div>
          </Card>

          <Card title="แนวโน้มรายเดือน: FTF % และ PM ตามแผน %">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={settings.target_ftf} stroke="#2e86de" strokeDasharray="4 4" />
                  <ReferenceLine y={settings.target_pm} stroke="#10b981" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="FTF %" stroke="#2e86de" strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="PM ตามแผน %" stroke="#10b981" strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-slate-400">เส้นประ = เป้าหมาย (FTF {settings.target_ftf}% / PM {settings.target_pm}%)</p>
          </Card>

          <Card title="ตารางแยกรายเดือน (พ.ย. – ต.ค.)">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {["เดือน","ผิดพลาด (ครั้ง)","ความเสียหาย (บาท)","เคสทั้งหมด","แก้ซ้ำ","FTF %","PM มอบหมาย","PM ตรงแผน","PM %","ร้องเรียน"].map((h) => (
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((r) => (
                    <tr key={r.m} className={r.has ? "" : "text-slate-300"}>
                      <td className="td font-medium">{r.label}</td>
                      <td className="td">{r.t.err_count}</td>
                      <td className="td">{fmt(r.t.err_damage, 0)}</td>
                      <td className="td">{r.t.total_cases}</td>
                      <td className="td">{r.t.repeat_cases}</td>
                      <td className={`td ${r.ftf != null && r.ftf < settings.target_ftf ? "font-semibold text-rose-600" : ""}`}>{fmt(r.ftf)}</td>
                      <td className="td">{r.t.pm_assigned}</td>
                      <td className="td">{r.t.pm_on_plan}</td>
                      <td className={`td ${r.pm != null && r.pm < settings.target_pm ? "font-semibold text-rose-600" : ""}`}>{fmt(r.pm)}</td>
                      <td className="td">{complaintTotal(r.t)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="td">สะสม</td>
                    <td className="td">{all.err_count}</td>
                    <td className="td">{fmt(all.err_damage, 0)}</td>
                    <td className="td">{all.total_cases}</td>
                    <td className="td">{all.repeat_cases}</td>
                    <td className="td">{fmt(ftfPct(all))}</td>
                    <td className="td">{all.pm_assigned}</td>
                    <td className="td">{all.pm_on_plan}</td>
                    <td className="td">{fmt(pmPct(all))}</td>
                    <td className="td">{complaintTotal(all)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
