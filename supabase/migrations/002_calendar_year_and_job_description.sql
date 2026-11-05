-- =====================================================================
-- Migration 002 : เปลี่ยนจาก "ปีงบประมาณ" เป็น "ปีปฏิทิน" + พนักงาน (ตำแหน่งอิสระ + Job Description)
-- รันใน Supabase > SQL Editor ครั้งเดียว (รันซ้ำได้ ไม่เสียหาย)
-- =====================================================================

-- 1) พนักงาน: ตำแหน่งพิมพ์เองได้ และเพิ่ม Job Description
alter table public.engineers drop constraint if exists engineers_position_check;
alter table public.engineers add column if not exists job_description text not null default '';

-- 2) เปลี่ยนชื่อคอลัมน์ fiscal_year -> year
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'kpi_settings' and column_name = 'fiscal_year') then
    alter table public.kpi_settings rename column fiscal_year to year;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'monthly_kpi_logs' and column_name = 'fiscal_year') then
    alter table public.monthly_kpi_logs rename column fiscal_year to year;
  end if;
end $$;

alter index if exists public.logs_fy_month_idx rename to logs_year_month_idx;

-- 3) trigger: ปี (พ.ศ.) = ปี ค.ศ. ของเดือนที่บันทึก + 543
create or replace function public.set_log_fields()
returns trigger language plpgsql as $$
begin
  new.year := extract(year from new.month)::int + 543;
  new.updated_at := now();
  return new;
end;
$$;

-- 4) คำนวณปีใหม่ให้ข้อมูลที่มีอยู่แล้ว (เช่น พ.ย. 2026 จากเดิมนับเป็น 2570 จะกลายเป็น 2569)
update public.monthly_kpi_logs set month = month;

-- 5) แถวตั้งค่าเริ่มต้นของปี 2569 (ถ้ายังไม่มี) -- ปีอื่นระบบสร้างให้เมื่อกดบันทึกที่หน้า "ตั้งค่า"
insert into public.kpi_settings (year) values (2569) on conflict do nothing;
