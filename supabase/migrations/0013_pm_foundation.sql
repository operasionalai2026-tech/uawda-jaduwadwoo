-- Fase 8: Fondasi Project & Team Management.
--
-- Menggantikan model lama (kpi_metrics/kpi_entries, eval_cycles, point_catalog,
-- kpi_tasks) dengan model tugas/proyek baru. Tabel lama TIDAK dihapus -- dibiarkan
-- dorman supaya data lama aman & perubahan ini reversibel.
--
-- Model tugas baru:
--   status : idea (menunggu approval) -> todo -> in_progress -> in_review -> done
--            (+ cancelled untuk task yang dibatalkan/ditolak)
--   type   : fitur, pengembangan, masalah
--   level  : urgent, medium, low
-- Poin didapat dari task yang selesai (status = done), default per level.

-- ---------------------------------------------------------------------------
-- Enums (idempotent: skip kalau sudah ada)
-- ---------------------------------------------------------------------------
do $$ begin
  create type task_status as enum ('idea', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_type as enum ('fitur', 'pengembangan', 'masalah');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_level as enum ('urgent', 'medium', 'low');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists pm_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  division_id uuid references divisions(id) on delete set null,
  start_date date,
  end_date date,
  type task_type not null default 'pengembangan',
  status task_status not null default 'todo',
  level task_level not null default 'medium',
  assignee_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pm_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type task_type not null default 'pengembangan',
  level task_level not null default 'medium',
  status task_status not null default 'todo',
  project_id uuid references pm_projects(id) on delete set null,
  division_id uuid references divisions(id) on delete cascade,
  assignee_id uuid references auth.users(id),
  created_by uuid references auth.users(id),
  start_date date,
  end_date date,
  points integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Triggers: default poin per level + updated_at (pola sama seperti 0008)
-- ---------------------------------------------------------------------------
create or replace function pm_default_task_points()
returns trigger
language plpgsql
as $$
begin
  if new.points is null or new.points = 0 then
    new.points := case new.level
      when 'urgent' then 30
      when 'medium' then 20
      when 'low' then 10
      else 20
    end;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pm_default_task_points on pm_tasks;
create trigger trg_pm_default_task_points
  before insert on pm_tasks
  for each row execute function pm_default_task_points();

create or replace function pm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_pm_tasks_touch on pm_tasks;
create trigger trg_pm_tasks_touch
  before update on pm_tasks
  for each row execute function pm_touch_updated_at();

drop trigger if exists trg_pm_projects_touch on pm_projects;
create trigger trg_pm_projects_touch
  before update on pm_projects
  for each row execute function pm_touch_updated_at();

-- ---------------------------------------------------------------------------
-- View: poin per user (dari task selesai)
-- ---------------------------------------------------------------------------
create or replace view pm_user_points as
select
  assignee_id,
  sum(points) as total_points,
  count(*) as done_count
from pm_tasks
where status = 'done' and assignee_id is not null
group by assignee_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table pm_projects enable row level security;
alter table pm_tasks enable row level security;

-- Semua authenticated boleh baca (transparansi lintas divisi read-only,
-- konsisten dgn tabel lain di app ini). Tulisan dibatasi per peran.
-- (drop-if-exists dulu supaya file aman dijalankan ulang.)
drop policy if exists "pm_projects_select_authenticated" on pm_projects;
create policy "pm_projects_select_authenticated" on pm_projects
  for select using (auth.role() = 'authenticated');

-- Proyek dibuat & dikelola Management/Owner saja.
drop policy if exists "pm_projects_write_admin" on pm_projects;
create policy "pm_projects_write_admin" on pm_projects
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin'))
  with check (get_user_role(auth.uid()) in ('superadmin', 'admin'));

drop policy if exists "pm_tasks_select_authenticated" on pm_tasks;
create policy "pm_tasks_select_authenticated" on pm_tasks
  for select using (auth.role() = 'authenticated');

-- INSERT: Staff untuk dirinya sendiri di divisinya; Lead untuk divisinya;
-- Management/Owner bebas lintas divisi. (Koersi status 'idea' utk Staff
-- ditangani di server action.)
drop policy if exists "pm_tasks_insert_staff" on pm_tasks;
create policy "pm_tasks_insert_staff" on pm_tasks
  for insert with check (
    created_by = auth.uid()
    and get_user_role(auth.uid()) = 'staff'
    and assignee_id = auth.uid()
    and division_id = get_user_division(auth.uid())
  );

drop policy if exists "pm_tasks_insert_leader" on pm_tasks;
create policy "pm_tasks_insert_leader" on pm_tasks
  for insert with check (
    created_by = auth.uid()
    and get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

drop policy if exists "pm_tasks_insert_admin" on pm_tasks;
create policy "pm_tasks_insert_admin" on pm_tasks
  for insert with check (
    created_by = auth.uid()
    and get_user_role(auth.uid()) in ('superadmin', 'admin')
  );

-- UPDATE: Staff hanya boleh menggerakkan task miliknya (assignee) -- approval
-- 'idea' -> 'todo' dicegah di server action. Lead mengelola divisinya.
-- Management/Owner bebas. Role diulang di WITH CHECK spy staff tidak lolos
-- lewat kombinasi OR antar-policy Postgres RLS.
drop policy if exists "pm_tasks_update_assignee" on pm_tasks;
create policy "pm_tasks_update_assignee" on pm_tasks
  for update using (assignee_id = auth.uid())
  with check (assignee_id = auth.uid());

drop policy if exists "pm_tasks_update_leader" on pm_tasks;
create policy "pm_tasks_update_leader" on pm_tasks
  for update using (
    get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  )
  with check (
    get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

drop policy if exists "pm_tasks_update_admin" on pm_tasks;
create policy "pm_tasks_update_admin" on pm_tasks
  for update using (get_user_role(auth.uid()) in ('superadmin', 'admin'))
  with check (get_user_role(auth.uid()) in ('superadmin', 'admin'));

-- DELETE: Lead (divisi sendiri) atau Management/Owner. Staff tidak menghapus
-- (pakai status cancelled).
drop policy if exists "pm_tasks_delete_leader" on pm_tasks;
create policy "pm_tasks_delete_leader" on pm_tasks
  for delete using (
    get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

drop policy if exists "pm_tasks_delete_admin" on pm_tasks;
create policy "pm_tasks_delete_admin" on pm_tasks
  for delete using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

-- ---------------------------------------------------------------------------
-- Grants (authenticated butuh privilege dasar sebelum RLS berlaku)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on pm_projects, pm_tasks to authenticated;
grant select on pm_user_points to authenticated;
