-- Fase 3: Forum & Meeting

create table forum_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  division_id uuid references divisions(id) -- null = lintas divisi
);

create table forum_threads (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references forum_categories(id) on delete cascade,
  title text not null,
  created_by uuid references auth.users(id),
  is_decision boolean not null default false,
  created_at timestamptz default now()
);

create table forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references forum_threads(id) on delete cascade,
  author_id uuid references auth.users(id),
  content text not null,
  created_at timestamptz default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  division_id uuid references divisions(id), -- null = lintas divisi
  scheduled_at timestamptz not null,
  location text,
  agenda text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'ongoing', 'done', 'cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table meeting_attendees (
  meeting_id uuid not null references meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'yes', 'no')),
  attended boolean not null default false,
  primary key (meeting_id, user_id)
);

create table notulen (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade unique,
  content text,
  source text not null default 'manual' check (source in ('manual', 'ai_generated', 'ai_edited')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  thread_id uuid references forum_threads(id),
  content text not null,
  source text not null default 'manual' check (source in ('manual', 'ai_generated', 'ai_edited')),
  created_at timestamptz default now()
);

create table action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid references meetings(id) on delete cascade,
  title text not null,
  assignee_id uuid references auth.users(id),
  due_date date,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'done', 'carried_over')),
  source text not null default 'manual' check (source in ('manual', 'ai_generated', 'ai_edited')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table forum_categories enable row level security;
alter table forum_threads enable row level security;
alter table forum_posts enable row level security;
alter table meetings enable row level security;
alter table meeting_attendees enable row level security;
alter table notulen enable row level security;
alter table decisions enable row level security;
alter table action_items enable row level security;

create policy "forum_categories_select_authenticated" on forum_categories
  for select using (auth.role() = 'authenticated');
create policy "forum_categories_write_admin" on forum_categories
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

create policy "forum_threads_select_authenticated" on forum_threads
  for select using (auth.role() = 'authenticated');
create policy "forum_threads_insert_authenticated" on forum_threads
  for insert with check (auth.role() = 'authenticated' and created_by = auth.uid());
create policy "forum_threads_update_own_or_admin" on forum_threads
  for update using (
    created_by = auth.uid() or get_user_role(auth.uid()) in ('superadmin', 'admin')
  );

create policy "forum_posts_select_authenticated" on forum_posts
  for select using (auth.role() = 'authenticated');
create policy "forum_posts_insert_authenticated" on forum_posts
  for insert with check (auth.role() = 'authenticated' and author_id = auth.uid());

create policy "meetings_select_authenticated" on meetings
  for select using (auth.role() = 'authenticated');
create policy "meetings_write_leader_admin" on meetings
  for all using (
    get_user_role(auth.uid()) in ('superadmin', 'admin')
    or (get_user_role(auth.uid()) = 'leader' and (division_id = get_user_division(auth.uid()) or division_id is null))
  );

create policy "meeting_attendees_select_authenticated" on meeting_attendees
  for select using (auth.role() = 'authenticated');
create policy "meeting_attendees_upsert_own" on meeting_attendees
  for insert with check (user_id = auth.uid());
create policy "meeting_attendees_update_own_or_admin" on meeting_attendees
  for update using (
    user_id = auth.uid() or get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
  );

create policy "notulen_select_authenticated" on notulen
  for select using (auth.role() = 'authenticated');
create policy "notulen_write_leader_admin" on notulen
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));

create policy "decisions_select_authenticated" on decisions
  for select using (auth.role() = 'authenticated');
create policy "decisions_write_leader_admin" on decisions
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));

create policy "action_items_select_authenticated" on action_items
  for select using (auth.role() = 'authenticated');
create policy "action_items_write_leader_admin" on action_items
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));
create policy "action_items_update_own_assignee" on action_items
  for update using (assignee_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on
  forum_categories, forum_threads, forum_posts,
  meetings, meeting_attendees, notulen, decisions, action_items
  to authenticated;
grant select on
  forum_categories, forum_threads, forum_posts,
  meetings, meeting_attendees, notulen, decisions, action_items
  to anon;
