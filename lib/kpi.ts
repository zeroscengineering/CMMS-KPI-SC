import type { GradeRule, MonthlyLog, ScoreResult, Settings, Totals } from "./types";

export const DEFAULT_GRADES: GradeRule[] = [
  { grade: "A", min: 90 },
  { grade: "B+", min: 80 },
  { grade: "B", min: 70 },
  { grade: "C+", min: 60 },
  { grade: "C", min: 50 },
  { grade: "D", min: 0 },
];

export const DEFAULT_SETTINGS: Omit<Settings, "fiscal_year"> = {
  weight_error: 30,
  weight_ftf: 30,
  weight_pm: 30,
  weight_complaint: 10,
  target_ftf: 95,
  target_pm: 90,
  pm_grace_days: 3,
  performance_share: 70,
  error_penalty: 50,
  complaint_penalty_l1: 20,
  complaint_penalty_l2: 50,
  complaint_penalty_l3: 100,
  grade_thresholds: DEFAULT_GRADES,
};

export const fmt = (n: number | null | undefined, digits = 1) =>
  n == null || Number.isNaN(n)
    ? "–"
    : n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pct = (num: number, den: number): number | null =>
  den > 0 ? (num / den) * 100 : null;

export function emptyTotals(): Totals {
  return {
    err_count: 0, err_damage: 0, total_cases: 0, repeat_cases: 0,
    pm_assigned: 0, pm_on_plan: 0, complaint_l1: 0, complaint_l2: 0, complaint_l3: 0,
  };
}

export function sumLogs(logs: Pick<MonthlyLog, keyof Totals>[]): Totals {
  const t = emptyTotals();
  for (const l of logs) {
    t.err_count += Number(l.err_count) || 0;
    t.err_damage += Number(l.err_damage) || 0;
    t.total_cases += Number(l.total_cases) || 0;
    t.repeat_cases += Number(l.repeat_cases) || 0;
    t.pm_assigned += Number(l.pm_assigned) || 0;
    t.pm_on_plan += Number(l.pm_on_plan) || 0;
    t.complaint_l1 += Number(l.complaint_l1) || 0;
    t.complaint_l2 += Number(l.complaint_l2) || 0;
    t.complaint_l3 += Number(l.complaint_l3) || 0;
  }
  return t;
}

/** First-Time Fix % = (เคสทั้งหมด - เคสแก้ซ้ำ) / เคสทั้งหมด */
export const ftfPct = (t: Totals) => pct(t.total_cases - t.repeat_cases, t.total_cases);
/** PM ตามแผน % = PM ทำครบตรงแผน / PM ที่ได้รับมอบหมาย */
export const pmPct = (t: Totals) => pct(t.pm_on_plan, t.pm_assigned);
export const complaintTotal = (t: Totals) => t.complaint_l1 + t.complaint_l2 + t.complaint_l3;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function gradeOf(total: number, rules: GradeRule[]): string {
  const sorted = [...(rules?.length ? rules : DEFAULT_GRADES)].sort((a, b) => b.min - a.min);
  return (sorted.find((r) => total >= r.min) ?? sorted[sorted.length - 1]).grade;
}

/**
 * คำนวณคะแนน (สมมติฐานการให้คะแนน — ปรับได้ในหน้า "ตั้งค่า"):
 *  KPI1: 100 - (จำนวนครั้งที่ผิดพลาด x error_penalty)   [เป้า 0 ครั้ง / 0 บาท]
 *  KPI2: ถ้า FTF >= เป้า => 100, ไม่เช่นนั้น = FTF / เป้า x 100
 *  KPI3: ถ้า PM% >= เป้า => 100, ไม่เช่นนั้น = PM% / เป้า x 100
 *  KPI4: 100 - Σ(จำนวนร้องเรียนแต่ละระดับ x คะแนนที่หักของระดับนั้น)
 *  KPI ที่ไม่มีข้อมูล (เช่นไม่มีเคส/ไม่มี PM ในช่วงนั้น) จะถูกตัดออก
 *  แล้วกระจายน้ำหนักที่เหลือให้รวมเป็น 100 อีกครั้ง
 */
export function scoreTotals(t: Totals, s: Settings, hasData: boolean): ScoreResult {
  const ftf = ftfPct(t);
  const pm = pmPct(t);

  const s1 = hasData ? clamp(100 - t.err_count * s.error_penalty) : null;
  const s2 = ftf == null ? null : clamp(ftf >= s.target_ftf ? 100 : (ftf / s.target_ftf) * 100);
  const s3 = pm == null ? null : clamp(pm >= s.target_pm ? 100 : (pm / s.target_pm) * 100);
  const s4 = hasData
    ? clamp(
        100 -
          t.complaint_l1 * s.complaint_penalty_l1 -
          t.complaint_l2 * s.complaint_penalty_l2 -
          t.complaint_l3 * s.complaint_penalty_l3
      )
    : null;

  const parts: [number | null, number][] = [
    [s1, s.weight_error],
    [s2, s.weight_ftf],
    [s3, s.weight_pm],
    [s4, s.weight_complaint],
  ];
  const activeW = parts.reduce((a, [sc, w]) => (sc == null ? a : a + w), 0);
  const pts = parts.map(([sc, w]) =>
    sc == null || activeW === 0 ? null : (sc * w) / activeW
  );
  const total = activeW === 0 ? null : pts.reduce<number>((a, p) => a + (p ?? 0), 0);

  return {
    ftf, pm, s1, s2, s3, s4,
    p1: pts[0], p2: pts[1], p3: pts[2], p4: pts[3],
    total,
    performance: total == null ? null : (total * s.performance_share) / 100,
    grade: total == null ? null : gradeOf(total, s.grade_thresholds),
  };
}

/** สถานะผ่าน/ไม่ผ่านเป้าหมายของ KPI แต่ละข้อ (null = ไม่มีข้อมูล) */
export function kpiPass(t: Totals, s: Settings, hasData: boolean) {
  const ftf = ftfPct(t);
  const pm = pmPct(t);
  return {
    k1: hasData ? t.err_count === 0 && t.err_damage === 0 : null,
    k2: ftf == null ? null : ftf >= s.target_ftf,
    k3: pm == null ? null : pm >= s.target_pm,
    k4: hasData ? complaintTotal(t) === 0 : null,
  };
}
