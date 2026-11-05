"use client";
import { useMemo, useState } from "react";
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, ClipboardCheck, ShieldAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { Card, ErrorBox, YearSelect, Loading, StatusBadge, GradeBadge } from "@/components/ui";
import Avatar3D from "@/components/Avatar3D";
import Trend from "@/components/Trend";
import { monthlySeries, teamEvaluation, trendOf } from "@/lib/evaluation";
import ExportButtons from "@/components/ExportButtons";
import { currentYear, yearMonths, thaiMonth } from "@/lib/period";
import { useYearData } from "@/lib/useYearData";
import { complaintTotal, fmt, ftfPct, kpiPass, pmPct, sumLogs } from "@/lib/kpi";

export default function DashboardPage() {
  const [fy, setFy] = useState(currentYear());
  const { settings, engineers, logs, items, scores, loading, error } = useYearData(fy);

  const all = useMemo(() => sumLogs(logs), [logs]);
  const hasData = logs.length > 0;
  const pass = kpiPass(all, settings, hasData);
  const teamEval = useMemo(
    () => teamEvaluation(engineers, logs, items, scores, settings),
    [engineers, logs, items, scores, settings]
  );
  const insight = useMemo(() => {
    const ms = yearMonths(fy);
    const rows = teamEval.rows.map(({ e }) => {
      const series = monthlySeries(e, ms, logs, items, scores, settings);
      return { e, series, trend: trendOf(series) };
    });
    // เดือนล่าสุดที่มีข้อมูลของใครสักคน
    let latest = -1;
    rows.forEach((r) => r.series.forEach((s, i) => { if (s.total != null && i > latest) latest = i; }));
    const star = latest < 0 ? null : rows
      .map((r) => ({ e: r.e, v: r.series[latest].total }))
      .filter((x): x is { e: typeof x.e; v: number } => x.v != null)
      .sort((a, b) => b.v - a.v)[0] ?? null;
    const watchMin = [...settings.grade_thresholds].sort((a, b) => a.min - b.min)[1]?.min ?? 50; // ต่ำกว่าเกรด C ขึ้นไปถือว่าต้องเฝ้าดู
    const watch = rows
      .filter((r) => r.trend && (r.trend.last < watchMin || (r.trend.delta != null && r.trend.delta <= -10)))
      .map((r) => ({ e: r.e, last: r.trend!.last, delta: r.trend!.delta }));
    return { latest: latest < 0 ? null : ms[latest], star, watch, watchMin };
  }, [fy, teamEval, logs, items, scores, settings]);

  const avgSeries = useMemo(() => {
    const ms = yearMonths(fy);
    const per = teamEval.rows.map((r) => monthlySeries(r.e, ms, logs, items, scores, settings));
    return ms.map((m, i) => {
      const v = per.map((p) => p[i].total).filter((x): x is number => x != null);
      return { name: thaiMonth(m), "คะแนนเฉลี่ยแผนก": v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : undefined };
    });
  }, [fy, teamEval, logs, items, scores, settings]);

  const monthly = useMemo(
    () =>
      yearMonths(fy).map((m) => {
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
          <h1 className="text-xl font-semibold">สรุปแผนก (สะสมทั้งปี)</h1>
          <p className="text-xs text-slate-500">ทีมงานที่ใช้งาน {engineers.filter((e) => e.active).length} คน</p>
        </div>
        <YearSelect value={fy} onChange={setFy} />
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
                {teamEval.avgTotal != null && (
                  <span className="ml-3 text-slate-500">
                    คะแนนเฉลี่ยแผนก {fmt(teamEval.avgTotal)} / 100 · เกรด {teamEval.grade} · ส่วนผลงาน {fmt(teamEval.avgPerformance)} / {settings.performance_share}
                  </span>
                )}
              </div>
              <ExportButtons fy={fy} />
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
            <Card title={`⭐ ดาวเด่น${insight.latest ? ` (${thaiMonth(insight.latest)})` : ""}`}>
              {insight.star ? (
                <Link href={`/individual/${insight.star.e.id}`} className="flex items-center gap-3">
                  <Avatar3D name={insight.star.e.full_name} size={56} />
                  <div><div className="font-semibold">{insight.star.e.full_name}</div><div className="text-sm text-slate-500">คะแนน {fmt(insight.star.v)} / 100</div></div>
                </Link>
              ) : <p className="text-sm text-slate-400">ยังไม่มีข้อมูล</p>}
            </Card>
            <Card title="⚠️ ควรเฝ้าดู">
              {insight.watch.length ? (
                <div className="space-y-1.5">
                  {insight.watch.map((w) => (
                    <Link key={w.e.id} href={`/individual/${w.e.id}`} className="flex items-center gap-2 text-sm hover:underline">
                      <Avatar3D name={w.e.full_name} size={28} /> {w.e.full_name}
                      <span className="text-slate-500">{fmt(w.last)}</span> <Trend delta={w.delta} />
                    </Link>
                  ))}
                  <p className="text-xs text-slate-400">คะแนนล่าสุดต่ำกว่า {insight.watchMin} หรือลดลง ≥ 10 จากเดือนก่อน</p>
                </div>
              ) : <p className="text-sm text-slate-400">ไม่มีใครต้องเฝ้าดู</p>}
            </Card>
          </div>

          <Card title="อันดับและคะแนนรายบุคคล (รวมเป็นคะแนนแผนก)">
            <div className="mb-3 flex flex-wrap gap-2 text-sm">
              {[...teamEval.gradeCount.entries()].sort().map(([g, n]) => (
                <span key={g} className="rounded-lg border px-2 py-1"><GradeBadge grade={g} /> {n} คน</span>
              ))}
              {teamEval.scoredCount === 0 && <span className="text-slate-400">ยังไม่มีคะแนน</span>}
            </div>
            <div className="space-y-2">
              {teamEval.rows.map(({ e, ev }, i) => (
                <Link key={e.id} href={`/individual/${e.id}`} className="flex items-center gap-3 rounded-lg p-1 hover:bg-slate-50">
                  <span className="w-5 text-xs text-slate-400">{i + 1}</span>
                  <Avatar3D name={e.full_name} size={36} />
                  <span className="w-40 truncate text-sm">{e.full_name}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                    <div className="h-full bg-brand-600" style={{ width: `${ev.total ?? 0}%` }} />
                  </div>
                  <span className="w-12 text-right text-sm font-semibold">{fmt(ev.total)}</span>
                  <GradeBadge grade={ev.grade} />
                </Link>
              ))}
            </div>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={avgSeries} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="คะแนนเฉลี่ยแผนก" stroke="#8b5cf6" strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
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

          <Card title="ตารางแยกรายเดือน (ม.ค. – ธ.ค.)">
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
