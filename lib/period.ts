// ปีปฏิทิน: ม.ค. - ธ.ค.  (เก็บข้อมูลเป็นรายปี แสดงผลเป็น พ.ศ. เช่น 2569 = ม.ค. - ธ.ค. 2026)
export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** รับ 'YYYY-MM-DD' (ค.ศ.) คืนปี พ.ศ. */
export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4)) + 543;
}

export function currentYear(): number {
  return new Date().getFullYear() + 543;
}

/** คืน 12 เดือนของปี (พ.ศ.) เรียง ม.ค. -> ธ.ค. เป็น 'YYYY-MM-01' (ค.ศ.) */
export function yearMonths(year: number): string[] {
  const ce = year - 543;
  return Array.from({ length: 12 }, (_, i) => `${ce}-${String(i + 1).padStart(2, "0")}-01`);
}

/** 'พ.ย. 69' */
export function thaiMonth(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return `${THAI_MONTHS_SHORT[m - 1]} ${String((y + 543) % 100).padStart(2, "0")}`;
}

export function yearLabel(year: number): string {
  return `ปี พ.ศ. ${year}`;
}
