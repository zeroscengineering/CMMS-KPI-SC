-- =====================================================================
-- Migration 003 : หัวข้อประเมินที่สร้างเองรายบุคคล + น้ำหนัก KPI หลักรายคน
-- รันใน Supabase > SQL Editor ครั้งเดียว (รันซ้ำได้ ไม่เสียหาย)
-- =====================================================================

-- 1) น้ำหนัก KPI หลัก 4 ข้อรายคน (NULL = ใช้ค่าตามการตั้งค่าของปีนั้น, 0 = ปิด KPI ข้อนั้นสำหรับคนนี้)
alter table public.engineers add column if not exists w_error     numeric check (w_error >= 0 and w_error <= 100);
alter table public.engineers add column if not exists w_ftf       numeric check (w_ftf >= 0 and w_ftf <= 100);
alter table public.engineers add column if not exists w_pm        numeric check (w_pm >= 0 and w_pm <= 100);
alter table public.engineers add column if not exists w_complaint numeric check (w_complaint >= 0 and w_complaint <= 100);

-- 2) หัวข้อประเมินที่สร้างเอง (ต่อบุคคล)
create table if not exists public.eval_items (
  id          uuid primary key default gen_random_uuid(),
  engineer_id uuid not null references public.engineers(id) on delete cascade,
  name        text not null,
  description text,
  kind        text not null default 'target' check (kind in ('target','rating')),  -- target = กรอกค่าจริงเทียบเป้า, rating = ให้คะแนน 1-5
  direction   text not null default 'higher' check (direction in ('higher','lower')), -- higher = ยิ่งมากยิ่งดี, lower = ยิ่งน้อยยิ่งดี
  target      numeric check (target >= 0),     -- เป้าหมายต่อเดือน (เฉพาะ kind = target)
  unit        text,                            -- หน่วย เช่น งาน, ชม., %
  weight      numeric not null default 0 check (weight >= 0 and weight <= 100),
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists eval_items_engineer_idx on public.eval_items (engineer_id);

-- 3) คะแนนรายเดือนของแต่ละหัวข้อ
create table if not exists public.eval_scores (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references public.eval_items(id) on delete cascade,
  month      date not null check (extract(day from month) = 1),
  actual     numeric check (actual >= 0),                    -- ค่าจริง (kind = target)
  rating     numeric check (rating >= 1 and rating <= 5),    -- คะแนน 1-5 (kind = rating)
  note       text,
  updated_at timestamptz not null default now(),
  constraint eval_scores_item_month_uq unique (item_id, month)
);
create index if not exists eval_scores_month_idx on public.eval_scores (month);

drop trigger if exists trg_touch_eval_scores on public.eval_scores;
create trigger trg_touch_eval_scores before update on public.eval_scores
  for each row execute function public.touch_settings();

-- 4) RLS
alter table public.eval_items  enable row level security;
alter table public.eval_scores enable row level security;

-- หัวข้อ: ทุกคนที่ล็อกอินอ่านได้, admin แก้ไขได้
drop policy if exists "eval_items_select" on public.eval_items;
create policy "eval_items_select" on public.eval_items
  for select to authenticated using (true);
drop policy if exists "eval_items_admin_write" on public.eval_items;
create policy "eval_items_admin_write" on public.eval_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- คะแนน: ทุกคนที่ล็อกอินอ่านได้, admin/editor บันทึกได้
drop policy if exists "eval_scores_select" on public.eval_scores;
create policy "eval_scores_select" on public.eval_scores
  for select to authenticated using (true);
drop policy if exists "eval_scores_editor_insert" on public.eval_scores;
create policy "eval_scores_editor_insert" on public.eval_scores
  for insert to authenticated with check (public.is_editor());
drop policy if exists "eval_scores_editor_update" on public.eval_scores;
create policy "eval_scores_editor_update" on public.eval_scores
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
drop policy if exists "eval_scores_editor_delete" on public.eval_scores;
create policy "eval_scores_editor_delete" on public.eval_scores
  for delete to authenticated using (public.is_editor());

-- 5) Grants (เฉพาะผู้ใช้ที่ล็อกอิน)
grant select, insert, update, delete on public.eval_items  to authenticated;
grant select, insert, update, delete on public.eval_scores to authenticated;
