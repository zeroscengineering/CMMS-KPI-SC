import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "./kpi";
import type { Engineer, MonthlyLog, Settings } from "./types";

export type YearData = { settings: Settings; engineers: Engineer[]; logs: MonthlyLog[] };

/** โหลดข้อมูลทั้งหมดของปีที่เลือก (ใช้ได้ทั้งฝั่ง client และ server) */
export async function loadYearData(sb: SupabaseClient, fy: number): Promise<YearData> {
  const [s, e, l] = await Promise.all([
    sb.from("kpi_settings").select("*").eq("year", fy).maybeSingle(),
    sb.from("engineers").select("*").order("full_name"),
    sb.from("monthly_kpi_logs").select("*").eq("year", fy).order("month"),
  ]);
  if (s.error) throw s.error;
  if (e.error) throw e.error;
  if (l.error) throw l.error;

  const row = s.data as Partial<Settings> | null;
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(row ?? {}),
    year: fy,
  } as Settings;
  // numeric จาก Postgres อาจเป็น string
  (Object.keys(settings) as (keyof Settings)[]).forEach((k) => {
    if (k !== "grade_thresholds" && typeof settings[k] === "string") {
      (settings as Record<string, unknown>)[k] = Number(settings[k]);
    }
  });

  const logs = (l.data as MonthlyLog[]).map((r) => ({ ...r, err_damage: Number(r.err_damage) }));
  return { settings, engineers: e.data as Engineer[], logs };
}
