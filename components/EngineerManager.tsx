"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import type { Engineer } from "@/lib/types";

const POSITION_SUGGESTIONS = ["วิศวกร", "ช่าง", "หัวหน้าช่าง", "ผู้ช่วยช่าง", "วิศวกรอาวุโส", "ผู้จัดการ"];

type Draft = { full_name: string; position: string; job_description: string };
const emptyDraft: Draft = { full_name: "", position: "", job_description: "" };

export default function EngineerManager({
  engineers,
  isAdmin,
  reload,
  onMessage,
}: {
  engineers: Engineer[];
  isAdmin: boolean;
  reload: () => void;
  onMessage: (m: { ok: boolean; text: string } | null) => void;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(emptyDraft);
  const [open, setOpen] = useState<string | null>(null);

  async function add() {
    if (!draft.full_name.trim()) return onMessage({ ok: false, text: "กรุณากรอกชื่อ-นามสกุล" });
    if (!draft.position.trim()) return onMessage({ ok: false, text: "กรุณาระบุตำแหน่ง" });
    const { error } = await getSupabase().from("engineers").insert({
      full_name: draft.full_name.trim(),
      position: draft.position.trim(),
      job_description: draft.job_description.trim(),
    });
    if (error) {
      return onMessage({ ok: false, text: error.code === "23505" ? "มีชื่อนี้อยู่แล้ว" : error.message });
    }
    setDraft(emptyDraft);
    onMessage({ ok: true, text: "เพิ่มพนักงานแล้ว" });
    reload();
  }

  function startEdit(e: Engineer) {
    setEditId(e.id);
    setEdit({ full_name: e.full_name, position: e.position, job_description: e.job_description ?? "" });
  }

  async function saveEdit() {
    if (!editId) return;
    if (!edit.full_name.trim() || !edit.position.trim()) {
      return onMessage({ ok: false, text: "ชื่อและตำแหน่งต้องไม่ว่าง" });
    }
    const { error } = await getSupabase()
      .from("engineers")
      .update({
        full_name: edit.full_name.trim(),
        position: edit.position.trim(),
        job_description: edit.job_description.trim(),
      })
      .eq("id", editId);
    if (error) {
      return onMessage({ ok: false, text: error.code === "23505" ? "มีชื่อนี้อยู่แล้ว" : error.message });
    }
    setEditId(null);
    onMessage({ ok: true, text: "บันทึกข้อมูลพนักงานแล้ว" });
    reload();
  }

  async function toggleActive(e: Engineer) {
    await getSupabase().from("engineers").update({ active: !e.active }).eq("id", e.id);
    reload();
  }

  async function remove(e: Engineer) {
    if (!confirm(`ลบ ${e.full_name} ? ข้อมูลบันทึกรายเดือนของคนนี้จะถูกลบด้วย (แนะนำให้ “ปิดใช้งาน” แทน)`)) return;
    const { error } = await getSupabase().from("engineers").delete().eq("id", e.id);
    if (error) onMessage({ ok: false, text: error.message });
    reload();
  }

  return (
    <div className="space-y-4">
      <datalist id="position-list">
        {POSITION_SUGGESTIONS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      {isAdmin && (
        <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-600">เพิ่มพนักงานใหม่</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="label">ชื่อ-นามสกุล</label>
              <input className="input" value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
            </div>
            <div>
              <label className="label">ตำแหน่ง (เลือกหรือพิมพ์เอง)</label>
              <input className="input" list="position-list" value={draft.position} onChange={(e) => setDraft({ ...draft, position: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Job Description (หน้าที่ความรับผิดชอบ)</label>
            <textarea className="input" rows={4} value={draft.job_description} onChange={(e) => setDraft({ ...draft, job_description: e.target.value })} />
          </div>
          <button className="btn" onClick={add}>
            <Plus size={16} /> เพิ่มพนักงาน
          </button>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {engineers.length === 0 && <div className="p-4 text-center text-sm text-slate-400">ยังไม่มีพนักงาน</div>}
        {engineers.map((e) => {
          const editing = editId === e.id;
          const expanded = open === e.id;
          return (
            <div key={e.id} className="p-3">
              {editing ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="label">ชื่อ-นามสกุล</label>
                      <input className="input" value={edit.full_name} onChange={(ev) => setEdit({ ...edit, full_name: ev.target.value })} />
                    </div>
                    <div>
                      <label className="label">ตำแหน่ง</label>
                      <input className="input" list="position-list" value={edit.position} onChange={(ev) => setEdit({ ...edit, position: ev.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Job Description</label>
                    <textarea className="input" rows={5} value={edit.job_description} onChange={(ev) => setEdit({ ...edit, job_description: ev.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button className="btn" onClick={saveEdit}><Save size={16} /> บันทึก</button>
                    <button className="btn-ghost" onClick={() => setEditId(null)}><X size={16} /> ยกเลิก</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="btn-ghost !px-2" onClick={() => setOpen(expanded ? null : e.id)} title="ดู Job Description">
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div className="min-w-[180px] flex-1">
                      <div className="font-medium">{e.full_name}</div>
                      <div className="text-xs text-slate-500">{e.position}</div>
                    </div>
                    <button
                      disabled={!isAdmin}
                      onClick={() => toggleActive(e)}
                      className={`rounded-full px-2 py-0.5 text-xs ${e.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}
                    >
                      {e.active ? "ใช้งาน" : "ปิดใช้งาน"}
                    </button>
                    {isAdmin && (
                      <>
                        <button className="btn-ghost !px-2" onClick={() => startEdit(e)} title="แก้ไข"><Pencil size={14} /></button>
                        <button className="btn-ghost !px-2 text-rose-600" onClick={() => remove(e)} title="ลบ"><Trash2 size={14} /></button>
                      </>
                    )}
                  </div>
                  {expanded && (
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      {e.job_description?.trim() ? e.job_description : <span className="text-slate-400">ยังไม่ได้ระบุ Job Description</span>}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
