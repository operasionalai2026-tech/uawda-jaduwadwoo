-- Fase 4: Task/Aktivitas berbasis poin -> KPI Individu
--
-- Alur: Owner/Leader diskusi di Forum -> Leader (divisi sendiri) atau Owner/
-- Admin (lintas divisi) buat task dari thread tsb, poin diambil dari katalog
-- yang cuma bisa diatur superadmin ("owner") -> karyawan submit selesai ->
-- leader/owner approve -> poin baru resmi masuk skor individu cycle terkait.

create table point_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points integer not null check (points > 0),
  description text,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table kpi_tasks (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references forum_threads(id) on delete restrict,
  cycle_id uuid not null references eval_cycles(id) on delete restrict,
  division_id uuid not null references divisions(id),
  point_catalog_id uuid not null references point_catalog(id),
  title text not null,
  description text,
  assignee_id uuid not null references auth.users(id),
  assigned_by uuid not null references auth.users(id),
  due_date date not null,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'submitted', 'approved', 'rejected', 'cancelled')),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  due_notified_at timestamptz, -- dipakai cron notifikasi email, biar tidak kirim dobel
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- due_date wajib berada di dalam rentang cycle-nya sendiri.
create or replace function validate_kpi_task_due_date()
returns trigger
language plpgsql
as $$
declare
  v_start date;
  v_end date;
begin
  select start_date, end_date into v_start, v_end
  from eval_cycles where id = new.cycle_id;

  if v_start is not null and new.due_date < v_start then
    raise exception 'due_date sebelum cycle mulai';
  end if;
  if v_end is not null and new.due_date > v_end then
    raise exception 'due_date sesudah cycle berakhir';
  end if;

  return new;
end;
$$;

create trigger trg_validate_kpi_task_due_date
  before insert or update of due_date, cycle_id on kpi_tasks
  for each row execute function validate_kpi_task_due_date();

create or replace function touch_kpi_task_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_kpi_task_updated_at
  before update on kpi_tasks
  for each row execute function touch_kpi_task_updated_at();

-- Rollup poin per karyawan per cycle, hanya task yang sudah di-approve.
create view individual_task_scores as
select
  t.assignee_id,
  t.cycle_id,
  t.division_id,
  sum(pc.points) as total_points,
  count(*) as approved_task_count
from kpi_tasks t
join point_catalog pc on pc.id = t.point_catalog_id
where t.status = 'approved'
group by t.assignee_id, t.cycle_id, t.division_id;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table point_catalog enable row level security;
alter table kpi_tasks enable row level security;

-- katalog poin: semua authenticated bisa baca; hanya superadmin ("owner")
-- yang boleh menentukan/mengubah nilai poin.
create policy "point_catalog_select_authenticated" on point_catalog
  for select using (auth.role() = 'authenticated');

create policy "point_catalog_write_superadmin" on point_catalog
  for all using (get_user_role(auth.uid()) = 'superadmin');

-- kpi_tasks: semua authenticated bisa baca (konsisten dgn tabel lain di app
-- ini yang transparan lintas divisi read-only).
create policy "kpi_tasks_select_authenticated" on kpi_tasks
  for select using (auth.role() = 'authenticated');

-- insert: leader hanya untuk divisinya sendiri.
create policy "kpi_tasks_insert_leader_own_division" on kpi_tasks
  for insert with check (
    assigned_by = auth.uid()
    and get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

-- insert: admin/superadmin bebas lintas divisi.
create policy "kpi_tasks_insert_admin" on kpi_tasks
  for insert with check (
    assigned_by = auth.uid()
    and get_user_role(auth.uid()) in ('superadmin', 'admin')
  );

-- update: karyawan (assignee) hanya boleh pindah status ke in_progress/
-- submitted -- tidak bisa approve/reject diri sendiri.
create policy "kpi_tasks_assignee_progress" on kpi_tasks
  for update using (assignee_id = auth.uid())
  with check (
    assignee_id = auth.uid()
    and status in ('in_progress', 'submitted')
  );

-- update: leader (divisi sendiri) atau admin/superadmin yang approve/reject/
-- cancel/edit. Kondisi role diulang di WITH CHECK (bukan cuma USING) supaya
-- staff tidak bisa lolos lewat kombinasi OR antar-policy Postgres RLS.
create policy "kpi_tasks_reviewer_manage" on kpi_tasks
  for update using (
    get_user_role(auth.uid()) in ('superadmin', 'admin')
    or (get_user_role(auth.uid()) = 'leader' and division_id = get_user_division(auth.uid()))
  )
  with check (
    get_user_role(auth.uid()) in ('superadmin', 'admin')
    or (get_user_role(auth.uid()) = 'leader' and division_id = get_user_division(auth.uid()))
  );

-- delete: dibatasi admin/superadmin saja supaya jejak approval tidak mudah hilang.
create policy "kpi_tasks_delete_admin" on kpi_tasks
  for delete using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on point_catalog, kpi_tasks to authenticated;
grant select on point_catalog to anon;
grant select on individual_task_scores to authenticated;
