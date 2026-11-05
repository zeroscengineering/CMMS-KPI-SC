"use client";
import { useMemo, useState } from "react";
import { Card, ErrorBox, YearSelect, GradeBadge, Loading } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import { currentYear, yearLabel } from "@/lib/period";
import { useYearData } from "@/lib/useYearData";
import { fmt, scoreTotals, sumLogs } from "@/lib/kpi";

export default function IndividualPage() {
  const [fy, setFy] = useState(currentYear());
  const { settings, engineers, logs, loading, error } = useYearData(fy);

  const rows = useMemo(
    () =>
      engineers
        .filter((e) => e.active || logs.some((l) => l.engineer_id === e.id))
        .map((e) => {
          const ls = logs.filter((l) => l.engineer_id === e.id);
          const t = sumLogs(ls);
          return { e, months: ls.length, t, r: scoreTotals(t, settings, ls.length > 0) };
        })
        .sort((a, b) => (b.r.total ?? -1) - (a.r.total ?? -1)),
    [engineers, logs, settings]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">สรุปรายบุคคล</h1>
          <p className="text-xs text-slate-500">{yearLabel(fy)}</p>
        </div>
        <YearSelect value={fy} onChange={setFy} />
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? <Loading /> : (
        <>
          <Card><ExportButtons fy={fy} /></Card>

          <Card title={`คะแนนถ่วงน้ำหนัก (เต็ม 100) และคะแนนส่วนผลงาน (เต็ม ${settings.performance_share})`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">#</th>
                    <th className="th">ชื่อ-นามสกุล</th>
                    <th className="th">ตำแหน่ง</th>
                    <th className="th">เดือนที่บันทึก</th>
                    <th className="th">K1 ผิดพลาด<br />({settings.weight_error}%)</th>
                    <th className="th">K2 FTF %<br />({settings.weight_ftf}%)</th>
                    <th className="th">K3 PM %<br />({settings.weight_pm}%)</th>
                    <th className="th">K4 ร้องเรียน<br />({settings.weight_complaint}%)</th>
                    <th className="th">รวม (100)</th>
                    <th className="th">ส่วนผลงาน ({settings.performance_share})</th>
                    <th className="th">เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ e, months, t, r }, i) => (
                    <tr key={e.id}>
                      <td className="td text-slate-400">{i + 1}</td>
                      <td className="td font-medium">
                        {e.job_description?.trim() ? (
                          <details>
                            <summary className="cursor-pointer">{e.full_name}</summary>
                            <div className="mt-1 max-w-xs whitespace-pre-wrap text-xs font-normal text-slate-500">{e.job_description}</div>
                          </details>
                        ) : (
                          e.full_name
                        )}
                      </td>
                      <td className="td">{e.position}</td>
                      <td className="td">{months}</td>
                      <td className="td">
                        {fmt(r.p1)} <span className="text-xs text-slate-400">({t.err_count} ครั้ง/{fmt(t.err_damage, 0)} ฿)</span>
                      </td>
                      <td className="td">
                        {fmt(r.p2)} <span className="text-xs text-slate-400">({fmt(r.ftf)}%)</span>
                      </td>
                      <td className="td">
                        {fmt(r.p3)} <span className="text-xs text-slate-400">({fmt(r.pm)}%)</span>
                      </td>
                      <td className="td">
                        {fmt(r.p4)} <span className="text-xs text-slate-400">({t.complaint_l1 + t.complaint_l2 + t.complaint_l3} ครั้ง)</span>
                      </td>
                      <td className="td font-semibold">{fmt(r.total)}</td>
                      <td className="td font-semibold text-brand-700">{fmt(r.performance)}</td>
                      <td className="td"><GradeBadge grade={r.grade} /></td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={11}>ยังไม่มีข้อมูล</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              ตัวเลขใต้แต่ละ KPI คือ “คะแนนที่ได้ตามน้ำหนัก” (เช่น KPI น้ำหนัก 30% ได้เต็มจะแสดง 30.0)
              ถ้า KPI ใดไม่มีข้อมูล (เช่นไม่มี PM ในช่วงนั้น) ระบบจะตัด KPI นั้นออกและกระจายน้ำหนักที่เหลือให้รวมเป็น 100
            </p>
          </Card>

          <Card title="เกณฑ์เกรด">
            <div className="flex flex-wrap gap-2 text-sm">
              {[...settings.grade_thresholds].sort((a, b) => b.min - a.min).map((g) => (
                <span key={g.grade} className="rounded-lg border px-3 py-1">
                  <GradeBadge grade={g.grade} /> ≥ {g.min}
                </span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
