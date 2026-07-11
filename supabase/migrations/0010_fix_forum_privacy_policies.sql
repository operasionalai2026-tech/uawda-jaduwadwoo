-- Perbaikan idempotent untuk 0009: kemungkinan 0009 sempat berhenti di
-- tengah jalan (policy lama ke-drop tapi policy baru gagal dibuat -> RLS
-- insert forum_threads jadi tidak punya policy sama sekali = semua insert
-- ditolak). Skrip ini aman dijalankan berkali-kali, dari kondisi apa pun.

-- Kolom & tabel (aman walau sudah ada dari 0009 yang sempat jalan sebagian)
alter table forum_threads
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

create table if not exists forum_thread_divisions (
  thread_id uuid not null references forum_threads(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  primary key (thread_id, division_id)
);

create or replace function can_view_thread(p_thread_id uuid, p_uid uuid)
returns boolean
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_visibility text;
  v_created_by uuid;
begin
  select visibility, created_by into v_visibility, v_created_by
  from forum_threads where id = p_thread_id;

  if v_visibility is null then
    return false;
  end if;

  if v_visibility = 'public' then
    return true;
  end if;

  if get_user_role(p_uid) = 'superadmin' then
    return true;
  end if;

  if v_created_by = p_uid then
    return true;
  end if;

  return exists (
    select 1 from forum_thread_divisions ftd
    where ftd.thread_id = p_thread_id
    and ftd.division_id = get_user_division(p_uid)
  );
end;
$$;

-- Drop + recreate semua policy yang seharusnya dari 0009, pakai IF EXISTS
-- supaya tidak peduli mana yang sudah/belum ada.

drop policy if exists "forum_threads_select_authenticated" on forum_threads;
drop policy if exists "forum_threads_select_visible" on forum_threads;
create policy "forum_threads_select_visible" on forum_threads
  for select using (auth.role() = 'authenticated' and can_view_thread(id, auth.uid()));

drop policy if exists "forum_posts_select_authenticated" on forum_posts;
drop policy if exists "forum_posts_select_visible" on forum_posts;
create policy "forum_posts_select_visible" on forum_posts
  for select using (auth.role() = 'authenticated' and can_view_thread(thread_id, auth.uid()));

drop policy if exists "forum_threads_insert_authenticated" on forum_threads;
drop policy if exists "forum_threads_insert_public" on forum_threads;
create policy "forum_threads_insert_public" on forum_threads
  for insert with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
    and visibility = 'public'
  );

drop policy if exists "forum_threads_insert_private" on forum_threads;
create policy "forum_threads_insert_private" on forum_threads
  for insert with check (
    created_by = auth.uid()
    and visibility = 'private'
    and get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
  );

drop policy if exists "forum_posts_insert_authenticated" on forum_posts;
drop policy if exists "forum_posts_insert_visible" on forum_posts;
create policy "forum_posts_insert_visible" on forum_posts
  for insert with check (
    auth.role() = 'authenticated'
    and author_id = auth.uid()
    and can_view_thread(thread_id, auth.uid())
  );

alter table forum_thread_divisions enable row level security;

drop policy if exists "forum_thread_divisions_select_visible" on forum_thread_divisions;
create policy "forum_thread_divisions_select_visible" on forum_thread_divisions
  for select using (auth.role() = 'authenticated' and can_view_thread(thread_id, auth.uid()));

drop policy if exists "forum_thread_divisions_insert_creator" on forum_thread_divisions;
create policy "forum_thread_divisions_insert_creator" on forum_thread_divisions
  for insert with check (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from forum_threads t
      where t.id = forum_thread_divisions.thread_id and t.created_by = auth.uid()
    )
  );

drop policy if exists "forum_thread_divisions_delete_creator" on forum_thread_divisions;
create policy "forum_thread_divisions_delete_creator" on forum_thread_divisions
  for delete using (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from forum_threads t
      where t.id = forum_thread_divisions.thread_id and t.created_by = auth.uid()
    )
  );

grant select, insert, delete on forum_thread_divisions to authenticated;

-- Governance policies (juga idempotent, jaga-jaga kalau ikut kepotong)
drop policy if exists "kpi_periods_write_admin" on kpi_periods;
drop policy if exists "kpi_periods_write_superadmin" on kpi_periods;
create policy "kpi_periods_write_superadmin" on kpi_periods
  for all using (get_user_role(auth.uid()) = 'superadmin');

drop policy if exists "eval_cycles_write_admin" on eval_cycles;
drop policy if exists "eval_cycles_write_superadmin" on eval_cycles;
create policy "eval_cycles_write_superadmin" on eval_cycles
  for all using (get_user_role(auth.uid()) = 'superadmin');
