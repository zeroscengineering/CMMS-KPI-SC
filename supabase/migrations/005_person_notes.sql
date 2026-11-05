-- Migration 005 : ความเห็นหัวหน้ารายคนรายเดือน (รันซ้ำได้)
create table if not exists public.person_notes (
  id          uuid primary key default gen_random_uuid(),
  engineer_id uuid not null references public.engineers(id) on delete cascade,
  month       date not null check (extract(day from month) = 1),
  note        text not null,
  author      text,
  updated_at  timestamptz not null default now(),
  constraint person_notes_uq unique (engineer_id, month)
);
alter table public.person_notes enable row level security;
drop policy if exists "person_notes_select" on public.person_notes;
create policy "person_notes_select" on public.person_notes for select to authenticated using (true);
drop policy if exists "person_notes_ins" on public.person_notes;
create policy "person_notes_ins" on public.person_notes for insert to authenticated with check (public.is_editor());
drop policy if exists "person_notes_upd" on public.person_notes;
create policy "person_notes_upd" on public.person_notes for update to authenticated using (public.is_editor()) with check (public.is_editor());
drop policy if exists "person_notes_del" on public.person_notes;
create policy "person_notes_del" on public.person_notes for delete to authenticated using (public.is_editor());
grant select, insert, update, delete on public.person_notes to authenticated;
