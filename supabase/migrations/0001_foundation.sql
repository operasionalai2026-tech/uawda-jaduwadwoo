-- Fase 1: Fondasi — divisions, profiles, user_roles, RLS helper functions

create table divisions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  leader_id uuid references auth.users(id),
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  division_id uuid references divisions(id),
  position text,
  employment_status text default 'active',
  joined_at date,
  created_at timestamptz default now()
);

create type app_role as enum ('superadmin', 'admin', 'leader', 'staff');

create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role app_role not null,
  division_id uuid references divisions(id),
  primary key (user_id, role)
);

-- SECURITY DEFINER helpers so RLS policies never self-query user_roles/profiles
-- directly (avoids infinite recursion on those tables' own policies).
create or replace function get_user_role(uid uuid)
returns app_role
language sql security definer stable
set search_path = public
as $$
  select role from user_roles where user_id = uid limit 1;
$$;

create or replace function get_user_division(uid uuid)
returns uuid
language sql security definer stable
set search_path = public
as $$
  select division_id from profiles where id = uid;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table divisions enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;

-- divisions: everyone authenticated can read (dashboard needs cross-division
-- read-only visibility for leaders per spec); only superadmin/admin can write.
create policy "divisions_select_authenticated" on divisions
  for select using (auth.role() = 'authenticated');

create policy "divisions_write_superadmin" on divisions
  for insert with check (get_user_role(auth.uid()) = 'superadmin');

create policy "divisions_update_superadmin" on divisions
  for update using (get_user_role(auth.uid()) = 'superadmin');

create policy "divisions_delete_superadmin" on divisions
  for delete using (get_user_role(auth.uid()) = 'superadmin');

-- profiles: user can read/update own profile; superadmin/admin can read & write all;
-- leader can read profiles within their own division.
create policy "profiles_select_self" on profiles
  for select using (id = auth.uid());

create policy "profiles_select_admin" on profiles
  for select using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

create policy "profiles_select_leader_own_division" on profiles
  for select using (
    get_user_role(auth.uid()) = 'leader'
    and division_id = get_user_division(auth.uid())
  );

create policy "profiles_update_self" on profiles
  for update using (id = auth.uid());

create policy "profiles_write_admin" on profiles
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

-- user_roles: only superadmin manages roles; users can read their own role row.
create policy "user_roles_select_self" on user_roles
  for select using (user_id = auth.uid());

create policy "user_roles_all_superadmin" on user_roles
  for all using (get_user_role(auth.uid()) = 'superadmin');
