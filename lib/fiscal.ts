// ปีงบประมาณ: พ.ย. - ต.ค.  (ปีงบประมาณ 2570 = พ.ย. 2569 ถึง ต.ค. 2570)
export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** รับ 'YYYY-MM-DD' (ค.ศ.) คืนปีงบประมาณ พ.ศ. */
export function fiscalYearOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return (m >= 11 ? y + 1 : y) + 543;
}

export function currentFiscalYear(): number {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  return fiscalYearOf(iso);
}

/** คืน 12 เดือนของปีงบประมาณ เรียง พ.ย. -> ต.ค. เป็น 'YYYY-MM-01' (ค.ศ.) */
export function fiscalMonths(fy: number): string[] {
  const startYear = fy - 543 - 1; // พ.ย. ของปี ค.ศ. ก่อนหน้า
  const out: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = 11 + i;
    const y = startYear + Math.floor((m - 1) / 12);
    const mm = ((m - 1) % 12) + 1;
    out.push(`${y}-${String(mm).padStart(2, "0")}-01`);
  }
  return out;
}

/** 'พ.ย. 69' */
export function thaiMonth(iso: string): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  return `${THAI_MONTHS_SHORT[m - 1]} ${String((y + 543) % 100).padStart(2, "0")}`;
}

export function fiscalLabel(fy: number): string {
  const ms = fiscalMonths(fy);
  return `ปีงบประมาณ ${fy} (${thaiMonth(ms[0])} – ${thaiMonth(ms[11])})`;
}
