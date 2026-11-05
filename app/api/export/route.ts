import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { loadYearData } from "@/lib/data";
import { buildWorkbook } from "@/lib/report";
import { uploadXlsxToDrive } from "@/lib/drive";
import { currentYear } from "@/lib/period";

export const runtime = "nodejs";
export const maxDuration = 60;

async function requireUser() {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  return { sb, user: data.user };
}

// GET /api/export?fy=2570  -> ดาวน์โหลดไฟล์ Excel
export async function GET(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "ยังไม่ได้ล็อกอิน" }, { status: 401 });

  const fy = Number(new URL(req.url).searchParams.get("fy")) || currentYear();
  const { buffer, filename } = await buildWorkbook(await loadYearData(sb, fy));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// POST /api/export {year, convertToSheets} -> อัปโหลดไป Google Drive
export async function POST(req: Request) {
  const { sb, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "ยังไม่ได้ล็อกอิน" }, { status: 401 });

  try {
    const body = await req.json();
    const fy = Number(body.year) || currentYear();
    const { buffer, filename } = await buildWorkbook(await loadYearData(sb, fy));
    const stamp = new Date().toISOString().slice(0, 10);
    const file = await uploadXlsxToDrive({
      filename: filename.replace(".xlsx", `_${stamp}.xlsx`),
      buffer,
      convertToSheets: !!body.convertToSheets,
    });
    return NextResponse.json(file);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
