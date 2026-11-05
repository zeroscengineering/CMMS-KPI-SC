"use client";
import { useState } from "react";
import { CloudUpload, Download, ExternalLink, Printer } from "lucide-react";

export default function ExportButtons({ fy }: { fy: number }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; link?: string } | null>(null);

  async function toDrive(convertToSheets: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: fy, convertToSheets }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "ส่งออกไม่สำเร็จ");
      setMsg({ ok: true, text: `อัปโหลดแล้ว: ${json.name}`, link: json.link });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <a className="btn-ghost" href={`/api/export?fy=${fy}`}>
        <Download size={14} /> ดาวน์โหลด Excel
      </a>
      <button className="btn-ghost" disabled={busy} onClick={() => toDrive(false)}>
        <CloudUpload size={14} /> ส่ง Excel ไป Google Drive
      </button>
      <button className="btn-ghost" disabled={busy} onClick={() => toDrive(true)}>
        <CloudUpload size={14} /> ส่งเป็น Google Sheets
      </button>
      <button className="btn-ghost" onClick={() => window.print()}>
        <Printer size={14} /> พิมพ์ / บันทึก PDF
      </button>
      {busy && <span className="text-xs text-slate-500">กำลังอัปโหลด…</span>}
      {msg && (
        <span className={`text-xs ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>
          {msg.text}{" "}
          {msg.link && (
            <a className="inline-flex items-center gap-1 underline" href={msg.link} target="_blank" rel="noreferrer">
              เปิดไฟล์ <ExternalLink size={12} />
            </a>
          )}
        </span>
      )}
    </div>
  );
}
