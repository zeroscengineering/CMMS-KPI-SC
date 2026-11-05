"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Engineer, JdSection } from "@/lib/types";

/** แปลงข้อความที่วางมา (1 หัวข้อ / 1.1 รายละเอียด) เป็นโครงสร้าง */
function parseJd(text: string): JdSection[] {
  const out: JdSection[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const sub = line.match(/^(\d+)\.(\d+)\s*(.+)$/);
    const main = line.match(/^(\d+)\s+(.+)$/);
    if (sub && out.length) out[out.length - 1].items.push(sub[3].trim());
    else if (main) out.push({ title: main[2].trim(), items: [] });
    else if (out.length) out[out.length - 1].items.push(line);
  }
  return out;
}

export default function JdEditor({
  engineer, canEdit, onChanged,
}: { engineer: Engineer; canEdit: boolean; onChanged: () => void }) {
  const [edit, setEdit] = useState<JdSection[] | null>(null);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const secs = engineer.jd_sections;

  async function save() {
    if (!edit) return;
    const clean = edit
      .map((s) => ({ title: s.title.trim(), items: s.items.map((i) => i.trim()).filter(Boolean) }))
      .filter((s) => s.title);
    const { error } = await getSupabase().from("engineers").update({ jd_sections: clean }).eq("id", engineer.id);
    if (error) return setMsg(error.message);
    setEdit(null); setMsg(null); onChanged();
  }
  const set = (fn: (d: JdSection[]) => void) => {
    const d = (edit ?? []).map((s) => ({ ...s, items: [...s.items] }));
    fn(d); setEdit(d);
  };

  if (!edit) {
    return (
      <div className="space-y-2">
        {secs.length === 0 && engineer.job_description?.trim() && (
          <div className="whitespace-pre-wrap rounded bg-slate-50 p-2 text-sm text-slate-600">{engineer.job_description}</div>
        )}
        {secs.length === 0 && !engineer.job_description?.trim() && <p className="text-sm text-slate-400">ยังไม่ได้ระบุ Job Description</p>}
        {secs.map((s, i) => (
          <div key={i} className="text-sm">
            <div className="font-semibold">{i + 1}. {s.title}</div>
            <ul className="ml-4 space-y-0.5 text-slate-600">
              {s.items.map((t, j) => <li key={j}><span className="text-slate-400">{i + 1}.{j + 1}</span> {t}</li>)}
            </ul>
          </div>
        ))}
        {canEdit && (
          <button className="btn-ghost" onClick={() => setEdit(secs.length ? secs.map((s) => ({ ...s, items: [...s.items] })) : [])}>
            แก้ไข Job Description
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {msg && <div className="rounded bg-rose-50 p-2 text-sm text-rose-700">{msg}</div>}
      {edit.map((s, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex gap-2">
            <span className="pt-2 text-sm font-semibold">{i + 1}</span>
            <input className="input flex-1 font-medium" placeholder="หัวข้อใหญ่ เช่น งานด้านวิศวกรรม" value={s.title}
              onChange={(e) => set((d) => { d[i].title = e.target.value; })} />
            <button className="text-xs text-rose-600" onClick={() => set((d) => { d.splice(i, 1); })}>ลบหัวข้อ</button>
          </div>
          <div className="mt-2 space-y-1.5 pl-5">
            {s.items.map((t, j) => (
              <div key={j} className="flex gap-2">
                <span className="pt-2 text-xs text-slate-400">{i + 1}.{j + 1}</span>
                <input className="input flex-1" value={t} onChange={(e) => set((d) => { d[i].items[j] = e.target.value; })} />
                <button className="text-xs text-slate-400" onClick={() => set((d) => { d[i].items.splice(j, 1); })}>✕</button>
              </div>
            ))}
            <button className="text-xs text-brand-700" onClick={() => set((d) => { d[i].items.push(""); })}>+ เพิ่มรายละเอียด</button>
          </div>
        </div>
      ))}
      <button className="btn-ghost" onClick={() => set((d) => { d.push({ title: "", items: [""] }); })}>+ เพิ่มหัวข้อใหญ่</button>

      <details className="rounded-lg border bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm">วางข้อความ JD ทั้งชุดเพื่อแปลงอัตโนมัติ</summary>
        <p className="my-2 text-xs text-slate-500">บรรทัดหัวข้อใหญ่ขึ้นต้นด้วย 1, 2, 3… และรายละเอียดขึ้นต้นด้วย 1.1, 1.2, 2.1… (คัดลอกจาก Excel มาวางได้เลย) การแปลงจะแทนที่รายการที่กำลังแก้อยู่</p>
        <textarea className="input" rows={6} value={paste} onChange={(e) => setPaste(e.target.value)} />
        <button className="btn-ghost mt-2" onClick={() => {
          const r = parseJd(paste);
          if (!r.length) return setMsg("อ่านรูปแบบข้อความไม่ได้ ตรวจสอบเลขหัวข้อ เช่น 1 ... และ 1.1 ...");
          setEdit(r); setPaste(""); setMsg(null);
        }}>แปลงเป็นรายการ</button>
      </details>

      <div className="flex gap-2">
        <button className="btn" onClick={save}>บันทึก</button>
        <button className="btn-ghost" onClick={() => { setEdit(null); setMsg(null); }}>ยกเลิก</button>
      </div>
    </div>
  );
}
