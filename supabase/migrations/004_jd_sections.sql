-- Migration 004 : Job Description แบบหัวข้อใหญ่ + รายละเอียดย่อย (รันซ้ำได้)
-- รูปแบบ: [{"title":"งานด้าน ...","items":["...","..."]}, ...]
alter table public.engineers add column if not exists jd_sections jsonb not null default '[]'::jsonb;
