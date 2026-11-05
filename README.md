# CMMS KPI — บริษัท เอสซี โซลูชั่น จำกัด (ปีงบประมาณ 2570)

ระบบบันทึกและประเมิน KPI ทีมวิศวกร/ช่าง  
Next.js 15 (App Router) · React 19 · Tailwind CSS 3 · Supabase (PostgreSQL + Auth + RLS) · Google Drive API · Vercel

## โครงสร้างโฟลเดอร์

```
cmms-kpi/
├─ supabase/schema.sql          # ตาราง + trigger + RLS (รันใน Supabase SQL Editor)
├─ middleware.ts                # บังคับล็อกอินทุกหน้า
├─ app/
│  ├─ layout.tsx, globals.css
│  ├─ page.tsx                  # สรุปแผนก (Dashboard)
│  ├─ entry/page.tsx            # บันทึกรายเดือน
│  ├─ individual/page.tsx       # สรุปรายบุคคล
│  ├─ settings/page.tsx         # ตั้งค่า: ทีมงาน, น้ำหนัก, เป้าหมาย, เกรด
│  ├─ login/page.tsx
│  └─ api/export/route.ts       # GET = ดาวน์โหลด Excel, POST = อัปโหลดไป Google Drive
├─ components/ (Nav, ui, ExportButtons)
└─ lib/
   ├─ supabase.ts               # Supabase client (Browser)
   ├─ supabase-server.ts        # Supabase client (Server)
   ├─ kpi.ts                    # สูตรคำนวณคะแนน/เกรด (แก้เกณฑ์ที่นี่)
   ├─ fiscal.ts                 # ปีงบประมาณ พ.ย.–ต.ค., เดือนไทย
   ├─ data.ts, useFiscalData.ts # โหลดข้อมูล
   ├─ report.ts                 # สร้างไฟล์ Excel
   └─ drive.ts                  # อัปโหลด Google Drive
```

## 1) ติดตั้งในเครื่อง

```bash
npm install
cp .env.example .env.local     # แล้วกรอกค่าตามข้อ 2-3
npm run dev                    # เปิด http://localhost:3000
```
ต้องใช้ Node.js 18.18 ขึ้นไป (แนะนำ 20+)

## 2) ตั้งค่า Supabase

1. สร้างโปรเจกต์ที่ https://supabase.com (เลือก Region Singapore)
2. ไปที่ **SQL Editor → New query** วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งไฟล์ แล้วกด **Run**
3. ไปที่ **Project Settings → API** คัดลอกค่า  
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`  
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. ไปที่ **Authentication → Providers → Email** (แนะนำปิด “Confirm email” ระหว่างทดสอบ)
5. เปิดเว็บ แล้ว **สมัครผู้ใช้คนแรก → ได้สิทธิ์ admin อัตโนมัติ**  
   จากนั้นไปที่ Authentication → Sign In / Providers แล้วปิด “Allow new users to sign up” เพื่อกันคนนอกสมัคร  
   (เพิ่มผู้ใช้ภายหลังที่ Authentication → Users → Add user แล้วเปลี่ยนสิทธิ์ใน Table Editor → `profiles.role`)

### สิทธิ์ผู้ใช้
| role | ดูข้อมูล | บันทึก/แก้ไขรายเดือน | แก้ตั้งค่า/รายชื่อทีม |
|---|---|---|---|
| admin | ✔ | ✔ | ✔ |
| editor | ✔ | ✔ | ✘ |
| viewer | ✔ | ✘ | ✘ |

สิทธิ์ถูกบังคับที่ฐานข้อมูลด้วย RLS (ไม่ใช่แค่ซ่อนปุ่มในหน้าเว็บ)

## 3) ตั้งค่า Google Drive

ใส่ `GOOGLE_DRIVE_FOLDER_ID` = ส่วนท้ายของ URL โฟลเดอร์ `https://drive.google.com/drive/folders/<FOLDER_ID>`

### วิธี A — OAuth Refresh Token (แนะนำสำหรับ Gmail ส่วนตัว)
เหตุผล: Service Account ไม่มีพื้นที่เก็บไฟล์ของตัวเอง อัปโหลดเข้า “My Drive” ของ Gmail ส่วนตัวจะ error `storageQuotaExceeded`

1. https://console.cloud.google.com → สร้างโปรเจกต์ → **APIs & Services → Library** เปิดใช้ **Google Drive API**
2. **OAuth consent screen**: เลือก External, กรอกชื่อแอป, เพิ่มอีเมลตัวเองใน Test users
3. **Credentials → Create credentials → OAuth client ID** ชนิด *Web application*  
   Authorized redirect URI: `https://developers.google.com/oauthplayground`
4. ไปที่ https://developers.google.com/oauthplayground → ⚙️ ติ๊ก **Use your own OAuth credentials** ใส่ Client ID/Secret  
   เลือก scope `https://www.googleapis.com/auth/drive` → Authorize → **Exchange authorization code for tokens**
5. คัดลอก **Refresh token** ใส่ใน `.env.local`
```
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
GOOGLE_OAUTH_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...
```
หมายเหตุ: ถ้า OAuth consent screen อยู่ในสถานะ *Testing* refresh token จะหมดอายุใน 7 วัน ให้กด **Publish app** (ใช้เองคนเดียวไม่ต้องรอตรวจสอบ)

### วิธี B — Service Account (ใช้กับ Google Workspace + Shared Drive)
1. Credentials → Create credentials → Service account → สร้าง Key แบบ JSON
2. นำ `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `private_key` → `GOOGLE_PRIVATE_KEY` (ครอบด้วย "" และคง `\n` ไว้)
3. เพิ่มอีเมล Service Account เป็นสมาชิก (Content manager) ของ **Shared Drive** ที่มีโฟลเดอร์ปลายทาง

## 4) Deploy: GitHub + Vercel

```bash
git init && git add . && git commit -m "init cmms-kpi"
git branch -M main
git remote add origin https://github.com/<user>/cmms-kpi.git
git push -u origin main
```
1. https://vercel.com → **Add New → Project** → เลือก repo
2. ใส่ Environment Variables ทั้งหมดจาก `.env.example` (ไม่ต้อง commit `.env.local`)
3. กด Deploy
4. กลับไป Supabase → Authentication → URL Configuration ใส่ Site URL เป็นโดเมนของ Vercel

## สมมติฐานการให้คะแนน (โปรดตรวจสอบ!)

ไฟล์ต้นฉบับไม่ได้ระบุสูตรแปลง “ผลจริง → คะแนน” และเกณฑ์เกรด ผมจึงตั้งค่าเริ่มต้นไว้ดังนี้ (แก้ได้ในหน้า **ตั้งค่า** หรือใน `lib/kpi.ts`):

| KPI | สูตรคะแนน (0–100) |
|---|---|
| 1 ความผิดพลาดหน้างาน (30%) | 100 − (จำนวนครั้ง × 50) เช่น 0 ครั้ง = 100, 1 ครั้ง = 50, ≥2 ครั้ง = 0 (มูลค่าความเสียหายแสดงรายงาน/เทียบเป้า 0 บาท แต่ไม่ถูกนำมาหักคะแนนเพิ่ม) |
| 2 First-Time Fix (30%) | FTF ≥ 95% = 100, ต่ำกว่านั้น = FTF ÷ 95 × 100 |
| 3 PM ตามแผน (30%) | PM% ≥ 90% = 100, ต่ำกว่านั้น = PM% ÷ 90 × 100 |
| 4 ข้อร้องเรียน (10%) | 100 − (ไม่เสียหาย×20 + เสียหายทรัพย์สิน/ปลอดภัย×50 + กระทบบริษัท×100) |

- **คะแนนรวม** = Σ(คะแนน KPI × น้ำหนัก) / 100  → **คะแนนส่วนผลงาน** = คะแนนรวม × 70%
- **เกรด**: A ≥ 90, B+ ≥ 80, B ≥ 70, C+ ≥ 60, C ≥ 50, D < 50
- KPI ที่ไม่มีข้อมูล (เช่น ไม่มี PM ที่ได้รับมอบหมาย) จะถูกตัดออกแล้วกระจายน้ำหนักที่เหลือให้รวมเป็น 100
- คะแนนรายบุคคลคำนวณจาก **ยอดสะสมทั้งปี** (รวมตัวเลขทุกเดือนก่อนแล้วจึงคิด %) ไม่ใช่ค่าเฉลี่ยของ % รายเดือน
- ปีงบประมาณ: พ.ย.–ต.ค. ปี 2570 = พ.ย. 2569 – ต.ค. 2570 (ระบบเก็บเดือนเป็น ค.ศ. และแสดงผลเป็น พ.ศ.)

## หมายเหตุ

- การ Export PDF: ปุ่ม “พิมพ์ / บันทึก PDF” ใช้ฟังก์ชันพิมพ์ของเบราว์เซอร์ (รองรับฟอนต์ไทยครบ) ส่วน Excel/Google Sheets ส่งขึ้น Drive ผ่าน API ได้โดยตรง
- ไฟล์ที่อัปโหลดจะมีวันที่ต่อท้ายชื่อ เช่น `KPI_FY2570_2026-11-05.xlsx`
