-- Fase 6: Proyek -- task berpoin tanpa perlu lahir dari Forum/Rapat.
-- Satu proyek bisa berisi task lintas divisi; task tetap tunduk pada RLS
-- kpi_tasks yang sudah ada (leader hanya bisa tambah task untuk divisinya
-- sendiri, admin/superadmin bebas lintas divisi) -- jadi proyek lintas
-- divisi secara alami terisi kolaboratif oleh leader masing-masing divisi.

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "projects_select_authenticated" on projects
  for select using (auth.role() = 'authenticated');

-- Sama seperti thread privat: pembuatan proyek dibatasi Leader Divisi ke atas.
create policy "projects_insert_leader_admin" on projects
  for insert with check (
    created_by = auth.uid()
    and get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
  );

create policy "projects_update_own_or_admin" on projects
  for update using (
    created_by = auth.uid()
    or get_user_role(auth.uid()) in ('superadmin', 'admin')
  );

create policy "projects_delete_admin" on projects
  for delete using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

grant select, insert, update, delete on projects to authenticated;
grant select on projects to anon;

-- kpi_tasks: task sekarang boleh lahir dari Proyek, bukan cuma dari thread
-- Forum. Salah satu dari thread_id/project_id wajib diisi (jejak asal-usul
-- tetap ada), tapi tidak wajib keduanya.
alter table kpi_tasks alter column thread_id drop not null;
alter table kpi_tasks add column project_id uuid references projects(id) on delete cascade;
alter table kpi_tasks add constraint kpi_tasks_origin_check
  check (thread_id is not null or project_id is not null);
