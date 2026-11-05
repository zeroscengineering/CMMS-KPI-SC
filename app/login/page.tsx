"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const sb = getSupabase();
    const { data, error } =
      mode === "in"
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) {
      return setMsg("สมัครสำเร็จ กรุณายืนยันอีเมล (ถ้าเปิดใช้งาน) แล้วเข้าสู่ระบบ");
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-brand-700">
        <Wrench size={22} /> CMMS KPI
      </div>
      <p className="mb-4 text-xs text-slate-500">บริษัท เอสซี โซลูชั่น จำกัด · ระบบประเมิน KPI ทีมวิศวกรและช่าง</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">อีเมล</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">รหัสผ่าน</label>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {msg && <p className="text-sm text-rose-600">{msg}</p>}
        <button className="btn w-full justify-center" disabled={busy}>
          {mode === "in" ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}
        </button>
      </form>
      <button className="mt-3 text-xs text-brand-600 underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "ยังไม่มีบัญชี? สมัครใช้งาน" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
      </button>
    </div>
  );
}
