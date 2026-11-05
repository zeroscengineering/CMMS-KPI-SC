import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "./kpi";
import { yearMonths } from "./period";
import type { Engineer, EvalItem, EvalScore, MonthlyLog, Settings } from "./types";

export type YearData = {
  settings: Settings;
  engineers: Engineer[];
  logs: MonthlyLog[];
  items: EvalItem[];
  scores: EvalScore[];
};

// numeric ของ Postgres อาจมาเป็น string
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

/** โหลดข้อมูลทั้งหมดของปีที่เลือก (ใช้ได้ทั้งฝั่ง client และ server) */
export async function loadYearData(sb: SupabaseClient, fy: number): Promise<YearData> {
  const ms = yearMonths(fy);
  const [s, e, l, it, sc] = await Promise.all([
    sb.from("kpi_settings").select("*").eq("year", fy).maybeSingle(),
    sb.from("engineers").select("*").order("full_name"),
    sb.from("monthly_kpi_logs").select("*").eq("year", fy).order("month"),
    sb.from("eval_items").select("*").order("sort_order").order("created_at"),
    sb.from("eval_scores").select("*").gte("month", ms[0]).lte("month", ms[11]),
  ]);
  if (s.error) throw s.error;
  if (e.error) throw e.error;
  if (l.error) throw l.error;
  if (it.error) throw it.error;
  if (sc.error) throw sc.error;

  const row = s.data as Partial<Settings> | null;
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...(row ?? {}),
    year: fy,
  } as Settings;
  (Object.keys(settings) as (keyof Settings)[]).forEach((k) => {
    if (k !== "grade_thresholds" && typeof settings[k] === "string") {
      (settings as Record<string, unknown>)[k] = Number(settings[k]);
    }
  });

  const logs = (l.data as MonthlyLog[]).map((r) => ({ ...r, err_damage: Number(r.err_damage) }));

  const engineers = (e.data as Engineer[]).map((r) => ({
    ...r,
    job_description: r.job_description ?? "",
    jd_sections: Array.isArray(r.jd_sections) ? r.jd_sections : [],
    w_error: num(r.w_error),
    w_ftf: num(r.w_ftf),
    w_pm: num(r.w_pm),
    w_complaint: num(r.w_complaint),
  }));

  const items = (it.data as EvalItem[]).map((r) => ({
    ...r,
    target: num(r.target),
    weight: Number(r.weight) || 0,
  }));

  const scores = (sc.data as EvalScore[]).map((r) => ({
    ...r,
    actual: num(r.actual),
    rating: num(r.rating),
  }));

  return { settings, engineers, logs, items, scores };
}
