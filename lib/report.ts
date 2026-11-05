import ExcelJS from "exceljs";
import type { YearData } from "./data";
import { yearLabel, yearMonths, thaiMonth } from "./period";
import { complaintTotal, ftfPct, pmPct, sumLogs } from "./kpi";
import { evaluatePerson, teamEvaluation } from "./evaluation";

function jdText(e: { job_description: string; jd_sections: { title: string; items: string[] }[] }) {
  if (!e.jd_sections?.length) return e.job_description ?? "";
  return e.jd_sections
    .map((s, i) => [`${i + 1} ${s.title}`, ...s.items.map((t, j) => `   ${i + 1}.${j + 1} ${t}`)].join("\n"))
    .join("\n");
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F6FC4" },
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 32;
}

/** สร้างไฟล์ Excel รายงานสรุป KPI 3 ชีต: สรุปรายบุคคล / สรุปแผนก / บันทึกรายเดือน */
export async function buildWorkbook({ settings, engineers, logs, items, scores }: YearData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CMMS KPI System";
  const fy = settings.year;
  const name = new Map(engineers.map((e) => [e.id, e]));

  // ---------- ชีต 1: สรุปรายบุคคล ----------
  const ws1 = wb.addWorksheet("สรุปรายบุคคล");
  ws1.addRow([`รายงานสรุปผลงานรายบุคคล - ${yearLabel(fy)}`]).font = { bold: true, size: 14 };
  ws1.addRow([]);
  styleHeader(
    ws1.addRow([
      "อันดับ", "ชื่อ-นามสกุล", "ตำแหน่ง",
      "KPI1 คะแนน", "KPI2 FTF %", "KPI2 คะแนน", "KPI3 PM %", "KPI3 คะแนน", "KPI4 คะแนน",
      "หัวข้อเพิ่มเติม (ชื่อ: คะแนน)",
      "คะแนนรวม (100)", `คะแนนส่วนผลงาน (${settings.performance_share})`, "เกรด", "Job Description",
    ])
  );
  const team = teamEvaluation(engineers, logs, items, scores, settings);
  const round = (n: number | null) => (n == null ? "-" : Math.round(n * 100) / 100);
  team.rows.forEach(({ e }, i) => {
    const ev = evaluatePerson(e, logs, items, scores, settings);
    const sc = (k: string) => round(ev.components.find((c) => c.key === k)?.score ?? null);
    const custom = ev.components
      .filter((c) => c.kind === "custom")
      .map((c) => `${c.label}: ${round(c.score)} (น้ำหนัก ${c.weight})`)
      .join("\n");
    ws1.addRow([
      i + 1, e.full_name, e.position, sc("k1"), round(ev.ftf), sc("k2"), round(ev.pm),
      sc("k3"), sc("k4"), custom, round(ev.total), round(ev.performance), ev.grade ?? "-",
      jdText(e),
    ]);
  });
  ws1.addRow([]);
  ws1.addRow(["", "เฉลี่ยทั้งแผนก", "", "", "", "", "", "", "", "", round(team.avgTotal), round(team.avgPerformance), team.grade ?? "-"]).font = { bold: true };
  ws1.columns.forEach((c, i) => (c.width = i === 1 ? 28 : i === 9 ? 45 : i === 13 ? 60 : 15));

  // ---------- ชีต 2: สรุปแผนก ----------
  const ws2 = wb.addWorksheet("สรุปแผนก");
  ws2.addRow([`สรุประดับแผนก - ${yearLabel(fy)}`]).font = { bold: true, size: 14 };
  ws2.addRow([]);
  styleHeader(
    ws2.addRow(["เดือน", "ผิดพลาด (ครั้ง)", "ความเสียหาย (บาท)", "เคสทั้งหมด", "เคสแก้ซ้ำ",
      "FTF %", "PM มอบหมาย", "PM ตรงแผน", "PM %", "ข้อร้องเรียน"])
  );
  for (const m of yearMonths(fy)) {
    const t = sumLogs(logs.filter((l) => l.month === m));
    const f = ftfPct(t);
    const p = pmPct(t);
    ws2.addRow([
      thaiMonth(m), t.err_count, t.err_damage, t.total_cases, t.repeat_cases,
      f == null ? "-" : Math.round(f * 10) / 10, t.pm_assigned, t.pm_on_plan,
      p == null ? "-" : Math.round(p * 10) / 10, complaintTotal(t),
    ]);
  }
  const all = sumLogs(logs);
  const tr = ws2.addRow([
    "สะสมทั้งปี", all.err_count, all.err_damage, all.total_cases, all.repeat_cases,
    ftfPct(all) == null ? "-" : Math.round(ftfPct(all)! * 10) / 10, all.pm_assigned, all.pm_on_plan,
    pmPct(all) == null ? "-" : Math.round(pmPct(all)! * 10) / 10, complaintTotal(all),
  ]);
  tr.font = { bold: true };
  ws2.columns.forEach((c) => (c.width = 16));

  // ---------- ชีต 3: บันทึกรายเดือน ----------
  const ws3 = wb.addWorksheet("บันทึกรายเดือน");
  styleHeader(
    ws3.addRow(["เดือน", "ชื่อ", "ผิดพลาด (ครั้ง)", "ความเสียหาย (บาท)", "เคสทั้งหมด", "เคสแก้ซ้ำ",
      "PM มอบหมาย", "PM ตรงแผน", "ร้องเรียนระดับ 1", "ร้องเรียนระดับ 2", "ร้องเรียนระดับ 3", "หมายเหตุ"])
  );
  for (const l of [...logs].sort((a, b) => a.month.localeCompare(b.month))) {
    ws3.addRow([
      thaiMonth(l.month), name.get(l.engineer_id)?.full_name ?? "?", l.err_count, l.err_damage,
      l.total_cases, l.repeat_cases, l.pm_assigned, l.pm_on_plan,
      l.complaint_l1, l.complaint_l2, l.complaint_l3, l.note ?? "",
    ]);
  }
  ws3.columns.forEach((c, i) => (c.width = i === 11 ? 40 : 16));

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, filename: `KPI_${fy}.xlsx` };
}
