export type Engineer = {
  id: string;
  full_name: string;
  position: string; // ตำแหน่ง (พิมพ์เองได้อิสระ)
  job_description: string; // Job Description (JD)
  active: boolean;
  // น้ำหนัก KPI หลักรายคน: null = ใช้ค่าของปีนั้น, 0 = ปิด KPI ข้อนั้น
  w_error: number | null;
  w_ftf: number | null;
  w_pm: number | null;
  w_complaint: number | null;
};

/** หัวข้อประเมินที่สร้างเอง (ต่อบุคคล) */
export type EvalItem = {
  id: string;
  engineer_id: string;
  name: string;
  description: string | null;
  kind: "target" | "rating"; // target = ค่าจริงเทียบเป้า, rating = ให้คะแนน 1-5
  direction: "higher" | "lower"; // higher = ยิ่งมากยิ่งดี
  target: number | null;
  unit: string | null;
  weight: number;
  active: boolean;
  sort_order: number;
};

/** คะแนนรายเดือนของหัวข้อ */
export type EvalScore = {
  id: string;
  item_id: string;
  month: string; // YYYY-MM-01
  actual: number | null;
  rating: number | null;
  note: string | null;
};

export type GradeRule = { grade: string; min: number };

export type Settings = {
  year: number;
  weight_error: number;
  weight_ftf: number;
  weight_pm: number;
  weight_complaint: number;
  target_ftf: number;
  target_pm: number;
  pm_grace_days: number;
  performance_share: number;
  error_penalty: number;
  complaint_penalty_l1: number;
  complaint_penalty_l2: number;
  complaint_penalty_l3: number;
  grade_thresholds: GradeRule[];
};

export type MonthlyLog = {
  id: string;
  engineer_id: string;
  month: string; // YYYY-MM-01
  year: number;
  err_count: number;
  err_damage: number;
  total_cases: number;
  repeat_cases: number;
  pm_assigned: number;
  pm_on_plan: number;
  complaint_l1: number;
  complaint_l2: number;
  complaint_l3: number;
  note: string | null;
};

export type Totals = {
  err_count: number;
  err_damage: number;
  total_cases: number;
  repeat_cases: number;
  pm_assigned: number;
  pm_on_plan: number;
  complaint_l1: number;
  complaint_l2: number;
  complaint_l3: number;
};

export type ScoreResult = {
  ftf: number | null; // %
  pm: number | null; // %
  s1: number | null; // คะแนน 0-100 ของแต่ละ KPI (null = ไม่มีข้อมูล)
  s2: number | null;
  s3: number | null;
  s4: number | null;
  p1: number | null; // คะแนนถ่วงน้ำหนัก (หลัง normalize น้ำหนักที่ใช้งานจริง)
  p2: number | null;
  p3: number | null;
  p4: number | null;
  total: number | null; // เต็ม 100
  performance: number | null; // คะแนนส่วนผลงาน (เต็ม performance_share)
  grade: string | null;
};
