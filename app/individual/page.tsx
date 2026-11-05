"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, ErrorBox, YearSelect, GradeBadge, Loading } from "@/components/ui";
import ExportButtons from "@/components/ExportButtons";
import Avatar3D from "@/components/Avatar3D";
import { currentYear, yearLabel } from "@/lib/period";
import { useYearData } from "@/lib/useYearData";
import { fmt } from "@/lib/kpi";
import { teamEvaluation } from "@/lib/evaluation";

export default function IndividualPage() {
  const [fy, setFy] = useState(currentYear());
  const { settings, engineers, logs, items, scores, loading, error } = useYearData(fy);
  const team = useMemo(
    () => teamEvaluation(engineers, logs, items, scores, settings),
    [engineers, logs, items, scores, settings]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">สรุปรายบุคคล</h1>
          <p className="text-xs text-slate-500">{yearLabel(fy)} · กดที่การ์ดเพื่อดูกราฟ หน้าที่ และตั้งหัวข้อประเมินของแต่ละคน</p>
        </div>
        <YearSelect value={fy} onChange={setFy} />
      </div>
      {error && <ErrorBox message={error} />}
      {loading ? <Loading /> : (
        <>
          <Card><ExportButtons fy={fy} /></Card>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.rows.map(({ e, ev }, i) => (
              <Link key={e.id} href={`/individual/${e.id}?fy=${fy}`} className="block">
                <Card className="transition hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Avatar3D name={e.full_name} size={64} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-400">อันดับ {i + 1}</div>
                      <div className="truncate font-semibold">{e.full_name}</div>
                      <div className="truncate text-xs text-slate-500">{e.position || "–"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold">{fmt(ev.total)}</div>
                      <GradeBadge grade={ev.grade} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {ev.components.filter((c) => c.weight > 0).map((c) => (
                      <div key={c.key} className="flex items-center gap-2 text-xs">
                        <span className="w-20 truncate text-slate-500">{c.short}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                          <div className="h-full bg-brand-600" style={{ width: `${c.score ?? 0}%` }} />
                        </div>
                        <span className="w-8 text-right">{c.score == null ? "–" : Math.round(c.score)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">ส่วนผลงาน {fmt(ev.performance)} / {settings.performance_share}</div>
                </Card>
              </Link>
            ))}
            {team.rows.length === 0 && <Card>ยังไม่มีข้อมูล</Card>}
          </div>
          <Card title="เกณฑ์เกรด">
            <div className="flex flex-wrap gap-2 text-sm">
              {[...settings.grade_thresholds].sort((a, b) => b.min - a.min).map((g) => (
                <span key={g.grade} className="rounded-lg border px-3 py-1"><GradeBadge grade={g.grade} /> ≥ {g.min}</span>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
