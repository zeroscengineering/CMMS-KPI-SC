import { gradeOf, scoreTotals, sumLogs, ftfPct, pmPct } from "./kpi";
import type { Engineer, EvalItem, EvalScore, MonthlyLog, Settings, Totals } from "./types";

export type Component = {
  key: string;
  label: string;
  short: string;
  kind: "core" | "custom";
  weight: number; // น้ำหนักที่ตั้งไว้ (%)
  score: number | null; // 0-100 (null = ยังไม่มีข้อมูล)
  points: number | null; // คะแนนถ่วงน้ำหนัก หลังปรับให้รวม 100
  detail: string; // ข้อความอธิบายผลจริง
};

export type PersonEval = {
  components: Component[];
  total: number | null; // เต็ม 100
  performance: number | null; // เต็ม performance_share
  grade: string | null;
  totals: Totals;
  ftf: number | null;
  pm: number | null;
  monthsWithData: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** น้ำหนัก KPI หลักของคนนี้ (ถ้าไม่ได้ตั้งเอง ใช้ค่าของปี) */
export function coreWeights(e: Engineer, s: Settings) {
  return {
    error: e.w_error ?? s.weight_error,
    ftf: e.w_ftf ?? s.weight_ftf,
    pm: e.w_pm ?? s.weight_pm,
    complaint: e.w_complaint ?? s.weight_complaint,
  };
}

/** คะแนน 0-100 ของหัวข้อที่สร้างเอง ในเดือนหนึ่ง */
export function itemMonthScore(item: EvalItem, sc: EvalScore): number | null {
  if (item.kind === "rating") {
    return sc.rating == null ? null : clamp((sc.rating / 5) * 100);
  }
  if (sc.actual == null || item.target == null) return null;
  const { actual, target } = sc;
  if (item.direction === "lower") {
    if (actual <= target) return 100;
    return target <= 0 ? 0 : clamp((target / actual) * 100);
  }
  return target <= 0 ? 100 : clamp((actual / target) * 100);
}

/**
 * ประเมินบุคคลหนึ่งคนในช่วงเวลาหนึ่ง (logs และ scores ที่ส่งเข้ามาควรถูกกรองตามช่วงเวลาแล้ว)
 *  - KPI หลัก 4 ข้อ: คำนวณจากยอดรวมของ logs (สูตรเดียวกับ scoreTotals)
 *  - หัวข้อที่สร้างเอง: เฉลี่ยคะแนนรายเดือนของหัวข้อนั้น
 *  - ถ่วงน้ำหนักเฉพาะหัวข้อที่มีข้อมูล แล้วปรับให้รวมเป็น 100
 */
export function evaluatePerson(
  e: Engineer,
  logs: MonthlyLog[],
  items: EvalItem[],
  scores: EvalScore[],
  s: Settings
): PersonEval {
  const mine = logs.filter((l) => l.engineer_id === e.id);
  const totals = sumLogs(mine);
  const core = scoreTotals(totals, s, mine.length > 0);
  const w = coreWeights(e, s);
  const ftf = ftfPct(totals);
  const pm = pmPct(totals);

  const raw: Omit<Component, "points">[] = [
    {
      key: "k1", label: "KPI1 ความผิดพลาดหน้างาน", short: "ผิดพลาด", kind: "core",
      weight: w.error, score: core.s1,
      detail: `${totals.err_count} ครั้ง / ${totals.err_damage.toLocaleString("th-TH")} บาท`,
    },
    {
      key: "k2", label: "KPI2 First-Time Fix", short: "FTF", kind: "core",
      weight: w.ftf, score: core.s2,
      detail: ftf == null ? "–" : `${ftf.toFixed(1)}%`,
    },
    {
      key: "k3", label: "KPI3 PM ตามแผน", short: "PM", kind: "core",
      weight: w.pm, score: core.s3,
      detail: pm == null ? "–" : `${pm.toFixed(1)}%`,
    },
    {
      key: "k4", label: "KPI4 ข้อร้องเรียนลูกค้า", short: "ร้องเรียน", kind: "core",
      weight: w.complaint, score: core.s4,
      detail: `${totals.complaint_l1 + totals.complaint_l2 + totals.complaint_l3} ครั้ง`,
    },
  ];

  const monthSet = new Set<string>(mine.map((l) => l.month));
  for (const it of items.filter((i) => i.engineer_id === e.id && i.active)) {
    const mineScores = scores.filter((sc) => sc.item_id === it.id);
    mineScores.forEach((sc) => monthSet.add(sc.month));
    const vals = mineScores
      .map((sc) => itemMonthScore(it, sc))
      .filter((x): x is number => x != null);
    const unit = it.unit ? ` ${it.unit}` : "";
    const detail =
      it.kind === "rating"
        ? `ประเมิน 1–5 (${vals.length} เดือน)`
        : `เป้า ${it.target ?? "–"}${unit}/เดือน (${vals.length} เดือน)`;
    raw.push({
      key: it.id,
      label: it.name,
      short: it.name.length > 12 ? `${it.name.slice(0, 12)}…` : it.name,
      kind: "custom",
      weight: it.weight,
      score: vals.length ? avg(vals) : null,
      detail,
    });
  }

  const activeW = raw.reduce((a, c) => (c.score == null ? a : a + c.weight), 0);
  const components: Component[] = raw.map((c) => ({
    ...c,
    points: c.score == null || activeW === 0 ? null : (c.score * c.weight) / activeW,
  }));
  const total = activeW === 0 ? null : components.reduce((a, c) => a + (c.points ?? 0), 0);

  return {
    components,
    total,
    performance: total == null ? null : (total * s.performance_share) / 100,
    grade: total == null ? null : gradeOf(total, s.grade_thresholds),
    totals,
    ftf,
    pm,
    monthsWithData: monthSet.size,
  };
}

/** คะแนนรวมรายเดือนของบุคคล (null = เดือนนั้นไม่มีข้อมูล) */
export function monthlySeries(
  e: Engineer,
  months: string[],
  logs: MonthlyLog[],
  items: EvalItem[],
  scores: EvalScore[],
  s: Settings
) {
  return months.map((m) => {
    const ev = evaluatePerson(
      e,
      logs.filter((l) => l.month === m),
      items,
      scores.filter((sc) => sc.month === m),
      s
    );
    return { month: m, ev, total: ev.monthsWithData > 0 ? ev.total : null };
  });
}

export type TeamRow = { e: Engineer; ev: PersonEval };

/** ประเมินทั้งแผนก (ทุกคนที่ใช้งานอยู่ หรือมีข้อมูลในปีนั้น) เรียงจากคะแนนมากไปน้อย */
export function teamEvaluation(
  engineers: Engineer[],
  logs: MonthlyLog[],
  items: EvalItem[],
  scores: EvalScore[],
  s: Settings
) {
  const itemIds = new Map(items.map((i) => [i.id, i.engineer_id]));
  const rows: TeamRow[] = engineers
    .filter(
      (e) =>
        e.active ||
        logs.some((l) => l.engineer_id === e.id) ||
        scores.some((sc) => itemIds.get(sc.item_id) === e.id)
    )
    .map((e) => ({ e, ev: evaluatePerson(e, logs, items, scores, s) }))
    .sort((a, b) => (b.ev.total ?? -1) - (a.ev.total ?? -1));

  const scored = rows.filter((r) => r.ev.total != null);
  const avgTotal = scored.length ? avg(scored.map((r) => r.ev.total as number)) : null;
  const avgPerformance = avgTotal == null ? null : (avgTotal * s.performance_share) / 100;
  const grade = avgTotal == null ? null : gradeOf(avgTotal, s.grade_thresholds);

  const gradeCount = new Map<string, number>();
  scored.forEach((r) => gradeCount.set(r.ev.grade as string, (gradeCount.get(r.ev.grade as string) ?? 0) + 1));

  return { rows, scoredCount: scored.length, avgTotal, avgPerformance, grade, gradeCount };
}
