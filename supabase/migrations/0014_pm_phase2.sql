-- Fase 9: Forum kategori/type + modul Retro (evaluasi ringan).
--
-- Forum: "Kategori Thread" (Idea/Improvement/Issue) jadi kolom enum baru.
--   "Type Thread" (Internal/Global) DIPETAKAN ke mekanisme privasi yang sudah
--   ada: Global = visibility 'public', Internal = visibility 'private' + divisi
--   pembuat masuk forum_thread_divisions. Jadi RLS forum tidak perlu diubah.
--
-- Retro: tabel evaluasi ringan (evaluator -> assignee) menggantikan alur
--   eval_cycles yang berat. Tabel lama tetap dorman.

-- ---------------------------------------------------------------------------
-- Forum: kategori thread
-- ---------------------------------------------------------------------------
do $$ begin
  create type thread_category as enum ('idea', 'improvement', 'issue');
exception when duplicate_object then null; end $$;

alter table forum_threads
  add column if not exists topic_category thread_category not null default 'idea';

-- category_id (forum_categories) tidak lagi wajib -- konsep kategori diganti
-- kolom enum di atas. Biarkan kolomnya untuk data lama, cukup lepas NOT NULL.
alter table forum_threads alter column category_id drop not null;

-- ---------------------------------------------------------------------------
-- Retro / Evaluasi ringan
-- ---------------------------------------------------------------------------
create table if not exists retros (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  evaluator_id uuid references auth.users(id),
  assignee_id uuid references auth.users(id),
  division_id uuid references divisions(id),
  eval_date date,
  created_at timestamptz default now()
);

alter table retros enable row level security;

-- SELECT: yang dinilai & penilai lihat miliknya; Management/Owner semua;
-- Lead lihat divisinya. (drop-if-exists supaya aman dijalankan ulang.)
drop policy if exists "retros_select_own" on retros;
create policy "retros_select_own" on retros
  for select using (assignee_id = auth.uid() or evaluator_id = auth.uid());

drop policy if exists "retros_select_admin" on retros;
create policy "retros_select_admin" on retros
  for select using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

drop policy if exists "retros_select_leader" on retros;
create policy "retros_select_leader" on retros
  for select using (
    get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

-- INSERT: Lead (divisi sendiri) / Management / Owner.
drop policy if exists "retros_insert_leader" on retros;
create policy "retros_insert_leader" on retros
  for insert with check (
    evaluator_id = auth.uid()
    and get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

drop policy if exists "retros_insert_admin" on retros;
create policy "retros_insert_admin" on retros
  for insert with check (
    evaluator_id = auth.uid()
    and get_user_role(auth.uid()) in ('superadmin', 'admin')
  );

-- UPDATE/DELETE: penilai sendiri atau Management/Owner.
drop policy if exists "retros_update_own_or_admin" on retros;
create policy "retros_update_own_or_admin" on retros
  for update using (
    evaluator_id = auth.uid() or get_user_role(auth.uid()) in ('superadmin', 'admin')
  );

drop policy if exists "retros_delete_own_or_admin" on retros;
create policy "retros_delete_own_or_admin" on retros
  for delete using (
    evaluator_id = auth.uid() or get_user_role(auth.uid()) in ('superadmin', 'admin')
  );

grant select, insert, update, delete on retros to authenticated;
