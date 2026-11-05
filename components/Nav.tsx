"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, LayoutDashboard, LogOut, Settings, Users, Wrench } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { useRole } from "@/lib/useFiscalData";

const links = [
  { href: "/", label: "สรุปแผนก", icon: LayoutDashboard },
  { href: "/entry", label: "บันทึกรายเดือน", icon: ClipboardList },
  { href: "/individual", label: "สรุปรายบุคคล", icon: Users },
  { href: "/settings", label: "ตั้งค่า", icon: Settings },
];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { role, email } = useRole();
  if (path.startsWith("/login")) return null;

  return (
    <nav className="sticky top-0 z-10 border-b bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2">
        <div className="mr-4 flex items-center gap-2 font-semibold text-brand-700">
          <Wrench size={20} /> CMMS KPI
        </div>
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} /> {label}
            </Link>
          );
        })}
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span className="hidden sm:inline">
            {email} {role && <b className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">{role}</b>}
          </span>
          <button
            className="btn-ghost"
            onClick={async () => {
              await getSupabase().auth.signOut();
              router.replace("/login");
            }}
          >
            <LogOut size={14} /> ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>
  );
}
