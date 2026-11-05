"use client";
import type { ReactNode } from "react";
import { currentFiscalYear, fiscalLabel } from "@/lib/fiscal";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-white p-4 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>}
      {children}
    </section>
  );
}

export function FiscalYearSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (fy: number) => void;
}) {
  const cur = currentFiscalYear();
  const years = [cur - 2, cur - 1, cur, cur + 1];
  return (
    <select className="input !w-auto" value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {years.map((y) => (
        <option key={y} value={y}>
          {fiscalLabel(y)}
        </option>
      ))}
    </select>
  );
}

/** ok: true = ผ่านเป้า, false = ไม่ผ่าน, null = ไม่มีข้อมูล */
export function StatusBadge({ ok }: { ok: boolean | null }) {
  if (ok == null) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">ไม่มีข้อมูล</span>;
  return ok ? (
    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">ผ่านเป้า</span>
  ) : (
    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">ต่ำกว่าเป้า</span>
  );
}

export function GradeBadge({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-slate-400">–</span>;
  const color =
    grade.startsWith("A") ? "bg-emerald-100 text-emerald-700"
    : grade.startsWith("B") ? "bg-sky-100 text-sky-700"
    : grade.startsWith("C") ? "bg-amber-100 text-amber-700"
    : "bg-rose-100 text-rose-700";
  return <span className={`rounded-md px-2 py-0.5 text-sm font-bold ${color}`}>{grade}</span>;
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function Loading() {
  return <div className="py-8 text-center text-sm text-slate-400">กำลังโหลดข้อมูล…</div>;
}
