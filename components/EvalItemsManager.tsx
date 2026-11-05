"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Engineer, EvalItem } from "@/lib/types";

type Draft = {
  name: string; description: string; kind: "target" | "rating";
  direction: "higher" | "lower"; target: string; unit: string; weight: string;
};
const empty: Draft = { name: "", description: "", kind: "target", direction: "higher", target: "", unit: "", weight: "10" };

export default function EvalItemsManager({
  engineer, items, allItems, engineers, isAdmin, onChanged,
}: {
  engineer: Engineer; items: EvalItem[]; allItems: EvalItem[]; engineers: Engineer[];
  isAdmin: boolean; onChanged: () => void;
}) {
  const [d, setD] = useState<Draft>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState("");
  const sb = getSupabase();

  const fail = (e: { message?: string } | null) => { setMsg(e?.message ?? null); return !!e; };

  async function save() {
    setMsg(null);
    if (!d.name.trim()) return setMsg("กรุณาใส่ชื่อหัวข้อ");
    if (d.kind === "target" && d.target.trim() === "") return setMsg("กรุณาใส่ค่าเป้าหมาย");
    const row = {
      name: d.name.trim(),
      description: d.description.trim() || null,
      kind: d.kind,
      direction: d.direction,
      target: d.kind === "target" ? Number(d.target) : null,
      unit: d.unit.trim() || null,
      weight: Number(d.weight) || 0,
    };
    const res = editId
      ? await sb.from("eval_items").update(row).eq("id", editId)
      : await sb.from("eval_items").insert({ ...row, engineer_id: engineer.id, sort_order: items.length });
    if (fail(res.error)) return;
    setD(empty); setEditId(null); onChanged();
  }

  async function toggle(it: EvalItem) {
    if (fail((await sb.from("eval_items").update({ active: !it.active }).eq("id", it.id)).error)) return;
    onChanged();
  }
  async function remove(it: EvalItem) {
    if (!confirm(`ลบหัวข้อ "${it.name}" และคะแนนทั้งหมดของหัวข้อนี้?`)) return;
    if (fail((await sb.from("eval_items").delete().eq("id", it.id)).error)) return;
    onChanged();
  }
  const jdItems = engineer.jd_sections.flatMap((sec, i) =>
    sec.items.map((t, j) => ({ key: `${i}.${j}`, label: `${i + 1}.${j + 1} ${t}`, name: t, group: sec.title }))
  );
  const [pick, setPick] = useState<Record<string, boolean>>({});
  async function fromJd() {
    const chosen = jdItems.filter((x) => pick[x.key] && !items.some((it) => it.name === x.name));
    if (!chosen.length) return setMsg("ยังไม่ได้เลือกรายการ (หรือมีหัวข้อชื่อเดียวกันแล้ว)");
    const rows = chosen.map((x, n) => ({
      engineer_id: engineer.id, name: x.name, description: x.group, kind: "rating", direction: "higher",
      target: null, unit: null, weight: 10, sort_order: items.length + n,
    }));
    if (fail((await sb.from("eval_items").insert(rows)).error)) return;
    setPick({}); onChanged();
  }
  async function copy() {
    if (!copyFrom) return;
    const src = allItems.filter((i) => i.engineer_id === copyFrom);
    if (!src.length) return setMsg("คนที่เลือกยังไม่มีหัวข้อ");
    const rows = src.map((i, n) => ({
      engineer_id: engineer.id, name: i.name, description: i.description, kind: i.kind,
      direction: i.direction, target: i.target, unit: i.unit, weight: i.weight, sort_order: items.length + n,
    }));
    if (fail((await sb.from("eval_items").insert(rows)).error)) return;
    setCopyFrom(""); onChanged();
  }
  function edit(it: EvalItem) {
    setEditId(it.id);
    setD({
      name: it.name, description: it.description ?? "", kind: it.kind, direction: it.direction,
      target: it.target == null ? "" : String(it.target), unit: it.unit ?? "", weight: String(it.weight),
    });
  }

  return (
    <div className="space-y-3">
      {msg && <div className="rounded bg-rose-50 p-2 text-sm text-rose-700">{msg}</div>}
      <table className="w-full">
        <thead><tr><th className="th">หัวข้อ</th><th className="th">วิธีให้คะแนน</th><th className="th">น้ำหนัก</th><th className="th">สถานะ</th>{isAdmin && <th className="th" />}</tr></thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className={it.active ? "" : "text-slate-300"}>
              <td className="td"><div className="font-medium">{it.name}</div>{it.description && <div className="text-xs text-slate-500">{it.description}</div>}</td>
              <td className="td text-xs">
                {it.kind === "rating" ? "ให้คะแนน 1–5" : `${it.direction === "higher" ? "≥" : "≤"} ${it.target}${it.unit ? " " + it.unit : ""} / เดือน`}
              </td>
              <td className="td">{it.weight}</td>
              <td className="td">{it.active ? "ใช้งาน" : "ปิด"}</td>
              {isAdmin && (
                <td className="td space-x-2 whitespace-nowrap text-xs">
                  <button className="text-brand-700" onClick={() => edit(it)}>แก้ไข</button>
                  <button className="text-slate-500" onClick={() => toggle(it)}>{it.active ? "ปิด" : "เปิด"}</button>
                  <button className="text-rose-600" onClick={() => remove(it)}>ลบ</button>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={5}>ยังไม่มีหัวข้อเพิ่มเติม (ใช้เฉพาะ KPI หลัก 4 ข้อ)</td></tr>}
        </tbody>
      </table>

      {isAdmin && jdItems.length > 0 && (
        <details className="rounded-lg border bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-medium">สร้างหัวข้อประเมินจาก Job Description</summary>
          <p className="my-2 text-xs text-slate-500">ติ๊กรายการที่ต้องการประเมิน ระบบจะสร้างเป็นหัวข้อให้คะแนน 1–5 น้ำหนัก 10 (ปรับภายหลังได้)</p>
          <div className="max-h-64 space-y-1 overflow-auto">
            {jdItems.map((x) => {
              const exists = items.some((it) => it.name === x.name);
              return (
                <label key={x.key} className={`flex items-start gap-2 text-sm ${exists ? "text-slate-300" : ""}`}>
                  <input type="checkbox" disabled={exists} checked={!!pick[x.key]} onChange={(e) => setPick({ ...pick, [x.key]: e.target.checked })} />
                  <span>{x.label}{exists && " (มีแล้ว)"}</span>
                </label>
              );
            })}
          </div>
          <button className="btn mt-2" onClick={fromJd}>สร้างหัวข้อที่เลือก</button>
        </details>
      )}

      {isAdmin && (
        <div className="rounded-lg border bg-slate-50 p-3">
          <div className="mb-2 text-sm font-medium">{editId ? "แก้ไขหัวข้อ" : "เพิ่มหัวข้อประเมินใหม่ (ตามหน้าที่ใน JD)"}</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="input" placeholder="ชื่อหัวข้อ เช่น ซ่อมบำรุงเครื่องจักรตามแผน" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
            <input className="input" placeholder="คำอธิบาย (ถ้ามี)" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
            <select className="input" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as Draft["kind"] })}>
              <option value="target">ค่าจริงเทียบเป้าหมาย (ตัวเลข)</option>
              <option value="rating">ให้คะแนน 1–5</option>
            </select>
            <input className="input" type="number" placeholder="น้ำหนัก (เช่น 10)" value={d.weight} onChange={(e) => setD({ ...d, weight: e.target.value })} />
            {d.kind === "target" && (
              <>
                <select className="input" value={d.direction} onChange={(e) => setD({ ...d, direction: e.target.value as Draft["direction"] })}>
                  <option value="higher">ยิ่งมากยิ่งดี</option>
                  <option value="lower">ยิ่งน้อยยิ่งดี</option>
                </select>
                <input className="input" type="number" placeholder="เป้าหมายต่อเดือน" value={d.target} onChange={(e) => setD({ ...d, target: e.target.value })} />
                <input className="input" placeholder="หน่วย เช่น งาน, ชม., %" value={d.unit} onChange={(e) => setD({ ...d, unit: e.target.value })} />
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button className="btn" onClick={save}>{editId ? "บันทึกการแก้ไข" : "เพิ่มหัวข้อ"}</button>
            {editId && <button className="btn-ghost" onClick={() => { setEditId(null); setD(empty); }}>ยกเลิก</button>}
            <span className="ml-auto flex items-center gap-2 text-xs">
              คัดลอกหัวข้อจาก
              <select className="input w-40" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                <option value="">เลือกคน…</option>
                {engineers.filter((e) => e.id !== engineer.id && allItems.some((i) => i.engineer_id === e.id)).map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name}</option>
                ))}
              </select>
              <button className="btn-ghost" onClick={copy}>คัดลอก</button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
