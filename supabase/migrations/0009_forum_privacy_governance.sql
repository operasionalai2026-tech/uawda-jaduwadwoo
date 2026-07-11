-- Fase 5: Privasi Forum (public/private multi-divisi) + pengetatan wewenang
-- governance (Owner vs Management) sesuai struktur Owner -> Management ->
-- Leader Divisi -> Staff. Role enum di DB tidak berubah (superadmin/admin/
-- leader/staff) -- hanya label tampilan di UI yang berubah jadi
-- Owner/Management/Leader Divisi/Staff.

-- ---------------------------------------------------------------------------
-- Forum privacy
-- ---------------------------------------------------------------------------

alter table forum_threads
  add column visibility text not null default 'public'
    check (visibility in ('public', 'private'));

create table forum_thread_divisions (
  thread_id uuid not null references forum_threads(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  primary key (thread_id, division_id)
);

-- Helper security-definer: dipakai forum_threads & forum_posts supaya logika
-- visibilitas tidak dobel dan tidak recursive-lock RLS antar tabel.
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

-- Ganti policy select lama (full-transparan) dengan yang menghormati privasi.
drop policy "forum_threads_select_authenticated" on forum_threads;
create policy "forum_threads_select_visible" on forum_threads
  for select using (auth.role() = 'authenticated' and can_view_thread(id, auth.uid()));

drop policy "forum_posts_select_authenticated" on forum_posts;
create policy "forum_posts_select_visible" on forum_posts
  for select using (auth.role() = 'authenticated' and can_view_thread(thread_id, auth.uid()));

-- Posting harus juga dibatasi ke thread yang terlihat -- tanpa ini, orang
-- yang tidak di-include masih bisa insert post ke thread privat kalau tahu
-- thread_id-nya walau tidak bisa membacanya.
drop policy "forum_posts_insert_authenticated" on forum_posts;
create policy "forum_posts_insert_visible" on forum_posts
  for insert with check (
    auth.role() = 'authenticated'
    and author_id = auth.uid()
    and can_view_thread(thread_id, auth.uid())
  );

-- Insert thread: publik tetap terbuka untuk semua; privat dibatasi
-- leader/admin/superadmin (Leader Divisi ke atas).
drop policy "forum_threads_insert_authenticated" on forum_threads;
create policy "forum_threads_insert_public" on forum_threads
  for insert with check (
    auth.role() = 'authenticated'
    and created_by = auth.uid()
    and visibility = 'public'
  );
create policy "forum_threads_insert_private" on forum_threads
  for insert with check (
    created_by = auth.uid()
    and visibility = 'private'
    and get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
  );

alter table forum_thread_divisions enable row level security;

create policy "forum_thread_divisions_select_visible" on forum_thread_divisions
  for select using (auth.role() = 'authenticated' and can_view_thread(thread_id, auth.uid()));

create policy "forum_thread_divisions_insert_creator" on forum_thread_divisions
  for insert with check (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from forum_threads t
      where t.id = forum_thread_divisions.thread_id and t.created_by = auth.uid()
    )
  );

create policy "forum_thread_divisions_delete_creator" on forum_thread_divisions
  for delete using (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from forum_threads t
      where t.id = forum_thread_divisions.thread_id and t.created_by = auth.uid()
    )
  );

grant select, insert, delete on forum_thread_divisions to authenticated;

-- ---------------------------------------------------------------------------
-- Governance: kunci aksi berdampak lintas-perusahaan (bukan operasional
-- harian) ke Owner (superadmin) saja. Management (admin) tetap pegang
-- kewenangan operasional lintas-divisi yang sudah ada (KPI metrics/entries,
-- meetings, dst) -- yang membedakan Management dari Leader Divisi adalah
-- cakupan (lintas-divisi vs satu divisi), bukan modul ini.
-- ---------------------------------------------------------------------------

-- Buka/kunci periode KPI adalah aksi global yang mempengaruhi semua divisi.
drop policy "kpi_periods_write_admin" on kpi_periods;
create policy "kpi_periods_write_superadmin" on kpi_periods
  for all using (get_user_role(auth.uid()) = 'superadmin');

-- Buka/tutup cycle evaluasi adalah aksi global yang mempengaruhi semua divisi.
drop policy "eval_cycles_write_admin" on eval_cycles;
create policy "eval_cycles_write_superadmin" on eval_cycles
  for all using (get_user_role(auth.uid()) = 'superadmin');
