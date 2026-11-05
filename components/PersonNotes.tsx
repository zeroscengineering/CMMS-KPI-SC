"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { thaiMonth } from "@/lib/period";

type Note = { id: string; month: string; note: string; author: string | null };

export default function PersonNotes({
  engineerId, months, canEdit, email,
}: { engineerId: string; months: string[]; canEdit: boolean; email: string | null }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [month, setMonth] = useState(months[Math.min(new Date().getMonth(), 11)]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().from("person_notes").select("*")
      .eq("engineer_id", engineerId).gte("month", months[0]).lte("month", months[11]).order("month");
    if (error) return setMsg(error.message);
    setNotes((data ?? []) as Note[]);
  }, [engineerId, months]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setText(notes.find((n) => n.month === month)?.note ?? ""); }, [month, notes]);

  async function save() {
    const sb = getSupabase();
    const existing = notes.find((n) => n.month === month);
    const res = text.trim() === ""
      ? existing ? await sb.from("person_notes").delete().eq("id", existing.id) : { error: null }
      : await sb.from("person_notes").upsert({ engineer_id: engineerId, month, note: text.trim(), author: email }, { onConflict: "engineer_id,month" });
    if (res.error) return setMsg(res.error.message);
    setMsg("บันทึกแล้ว"); load();
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="space-y-2">
          <select className="input w-48" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m} value={m}>{thaiMonth(m)}</option>)}
          </select>
          <textarea className="input" rows={3} placeholder="ความเห็น/เหตุผลของคะแนนเดือนนี้ ข้อควรพัฒนา คำชมเชย" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn" onClick={save}>บันทึกความเห็น</button>
          {msg && <span className="ml-3 text-sm text-slate-600">{msg}</span>}
        </div>
      )}
      <div className="space-y-1.5">
        {notes.map((n) => (
          <div key={n.id} className="rounded bg-slate-50 p-2 text-sm">
            <b className="mr-2 text-slate-600">{thaiMonth(n.month)}</b>{n.note}
            {n.author && <span className="ml-2 text-xs text-slate-400">— {n.author}</span>}
          </div>
        ))}
        {notes.length === 0 && <p className="text-sm text-slate-400">ยังไม่มีความเห็นในปีนี้</p>}
      </div>
    </div>
  );
}
