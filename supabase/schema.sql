-- =====================================================================
-- CMMS KPI System - แสงชัยแอร์ ควอลิตี้ จำกัด (ปีงบประมาณ 2570)
-- รันทั้งไฟล์นี้ใน Supabase > SQL Editor
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1) profiles : บทบาทผู้ใช้ (admin / editor / viewer)
--    ผู้ใช้คนแรกที่สมัครจะได้เป็น admin อัตโนมัติ
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'viewer' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when not exists (select 1 from public.profiles) then 'admin' else 'viewer' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.app_role() = 'admin', false) $$;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.app_role() in ('admin','editor'), false) $$;

-- ---------------------------------------------------------------------
-- 2) engineers : รายชื่อทีมงาน
-- ---------------------------------------------------------------------
create table if not exists public.engineers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  position   text not null default 'ช่าง' check (position in ('วิศวกร','ช่าง')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists engineers_full_name_uq on public.engineers (lower(full_name));

-- ---------------------------------------------------------------------
-- 3) kpi_settings : 1 แถวต่อปีงบประมาณ (พ.ศ.) เช่น 2570
-- ---------------------------------------------------------------------
create table if not exists public.kpi_settings (
  fiscal_year        int primary key,               -- พ.ศ. เช่น 2570 (พ.ย. 2569 - ต.ค. 2570)
  weight_error       numeric not null default 30,   -- KPI1 ความผิดพลาดหน้างาน
  weight_ftf         numeric not null default 30,   -- KPI2 First-Time Fix
  weight_pm          numeric not null default 30,   -- KPI3 PM ตามแผน
  weight_complaint   numeric not null default 10,   -- KPI4 ข้อร้องเรียน
  target_ftf         numeric not null default 95,   -- เป้าหมาย FTF (%)
  target_pm          numeric not null default 90,   -- เป้าหมาย PM (%)
  pm_grace_days      int     not null default 3,    -- PM ล่าช้าไม่เกินกี่วันนับว่าตรงแผน
  performance_share  numeric not null default 70,   -- สัดส่วนคะแนนผลงาน (%) ของการประเมินรวม
  error_penalty      numeric not null default 50,   -- หักคะแนน KPI1 ต่อความผิดพลาด 1 ครั้ง
  complaint_penalty_l1 numeric not null default 20, -- หักคะแนน KPI4: ไม่เกิดความเสียหาย
  complaint_penalty_l2 numeric not null default 50, -- เสียหายต่อทรัพย์สิน/ความปลอดภัย
  complaint_penalty_l3 numeric not null default 100,-- ส่งผลกระทบกับบริษัท
  grade_thresholds   jsonb not null default
    '[{"grade":"A","min":90},{"grade":"B+","min":80},{"grade":"B","min":70},{"grade":"C+","min":60},{"grade":"C","min":50},{"grade":"D","min":0}]'::jsonb,
  updated_at         timestamptz not null default now(),
  constraint weights_sum_100 check (weight_error + weight_ftf + weight_pm + weight_complaint = 100)
);

insert into public.kpi_settings (fiscal_year) values (2570) on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4) monthly_kpi_logs : 1 แถว = 1 คน x 1 เดือน
-- ---------------------------------------------------------------------
create table if not exists public.monthly_kpi_logs (
  id            uuid primary key default gen_random_uuid(),
  engineer_id   uuid not null references public.engineers(id) on delete cascade,
  month         date not null,                 -- วันที่ 1 ของเดือน (ค.ศ.) เช่น 2026-11-01
  fiscal_year   int  not null,                 -- พ.ศ. ถูกคำนวณโดย trigger

  -- KPI1
  err_count     int     not null default 0 check (err_count >= 0),
  err_damage    numeric not null default 0 check (err_damage >= 0),
  -- KPI2
  total_cases   int not null default 0 check (total_cases >= 0),
  repeat_cases  int not null default 0 check (repeat_cases >= 0),
  -- KPI3
  pm_assigned   int not null default 0 check (pm_assigned >= 0),
  pm_on_plan    int not null default 0 check (pm_on_plan >= 0),
  -- KPI4
  complaint_l1  int not null default 0 check (complaint_l1 >= 0),
  complaint_l2  int not null default 0 check (complaint_l2 >= 0),
  complaint_l3  int not null default 0 check (complaint_l3 >= 0),

  note          text,
  created_by    uuid references auth.users(id) default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint one_row_per_person_month unique (engineer_id, month),   -- กันกรอกซ้ำ
  constraint month_is_first_day check (extract(day from month) = 1),
  constraint repeat_le_total   check (repeat_cases <= total_cases),
  constraint pm_on_plan_le_assigned check (pm_on_plan <= pm_assigned)
);

create index if not exists logs_fy_month_idx on public.monthly_kpi_logs (fiscal_year, month);
create index if not exists logs_engineer_idx on public.monthly_kpi_logs (engineer_id);

-- trigger: คำนวณปีงบประมาณ (พ.ย.-ต.ค.) + updated_at
create or replace function public.set_log_fields()
returns trigger language plpgsql as $$
begin
  new.fiscal_year := (extract(year from new.month)::int
                      + case when extract(month from new.month) >= 11 then 1 else 0 end) + 543;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_set_log_fields on public.monthly_kpi_logs;
create trigger trg_set_log_fields
  before insert or update on public.monthly_kpi_logs
  for each row execute function public.set_log_fields();

create or replace function public.touch_settings()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists trg_touch_settings on public.kpi_settings;
create trigger trg_touch_settings before update on public.kpi_settings
  for each row execute function public.touch_settings();

-- ---------------------------------------------------------------------
-- 5) Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.engineers       enable row level security;
alter table public.kpi_settings    enable row level security;
alter table public.monthly_kpi_logs enable row level security;

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- engineers : ทุกคนที่ล็อกอินอ่านได้, admin แก้ไขได้
drop policy if exists "engineers_select" on public.engineers;
create policy "engineers_select" on public.engineers
  for select to authenticated using (true);
drop policy if exists "engineers_admin_write" on public.engineers;
create policy "engineers_admin_write" on public.engineers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- kpi_settings : ทุกคนอ่านได้, admin แก้ไขได้
drop policy if exists "settings_select" on public.kpi_settings;
create policy "settings_select" on public.kpi_settings
  for select to authenticated using (true);
drop policy if exists "settings_admin_write" on public.kpi_settings;
create policy "settings_admin_write" on public.kpi_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- monthly_kpi_logs : ทุกคนอ่านได้, admin/editor เขียนได้
drop policy if exists "logs_select" on public.monthly_kpi_logs;
create policy "logs_select" on public.monthly_kpi_logs
  for select to authenticated using (true);
drop policy if exists "logs_editor_insert" on public.monthly_kpi_logs;
create policy "logs_editor_insert" on public.monthly_kpi_logs
  for insert to authenticated with check (public.is_editor());
drop policy if exists "logs_editor_update" on public.monthly_kpi_logs;
create policy "logs_editor_update" on public.monthly_kpi_logs
  for update to authenticated using (public.is_editor()) with check (public.is_editor());
drop policy if exists "logs_editor_delete" on public.monthly_kpi_logs;
create policy "logs_editor_delete" on public.monthly_kpi_logs
  for delete to authenticated using (public.is_editor());
