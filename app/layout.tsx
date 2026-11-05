import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CMMS KPI | แสงชัยแอร์ ควอลิตี้",
  description: "ระบบบริหารงานซ่อมบำรุงและประเมิน KPI ทีมวิศวกรและช่าง",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={sarabun.className}>
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
