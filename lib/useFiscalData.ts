"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { loadFiscalData, type FiscalData } from "./data";
import { DEFAULT_SETTINGS } from "./kpi";

export function useFiscalData(fy: number) {
  const [data, setData] = useState<FiscalData>({
    settings: { ...DEFAULT_SETTINGS, fiscal_year: fy },
    engineers: [],
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadFiscalData(getSupabase(), fy));
    } catch (e) {
      setError((e as { message?: string })?.message ?? "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [fy]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...data, loading, error, reload };
}

export function useRole() {
  const [role, setRole] = useState<"admin" | "editor" | "viewer" | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const sb = getSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? null);
      const { data: p } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      setRole((p?.role as "admin" | "editor" | "viewer") ?? "viewer");
    });
  }, []);
  return { role, email, canEdit: role === "admin" || role === "editor", isAdmin: role === "admin" };
}
