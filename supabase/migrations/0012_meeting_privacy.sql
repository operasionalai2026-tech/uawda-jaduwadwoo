-- Fase 7: Privasi Rapat multi-divisi -- meniru pola forum_thread_divisions.
-- Rapat lama dengan division_id terisi otomatis jadi privat untuk divisi
-- itu; yang division_id-nya kosong ("Lintas Divisi") tetap publik.

alter table meetings
  add column visibility text not null default 'public'
    check (visibility in ('public', 'private'));

create table meeting_divisions (
  meeting_id uuid not null references meetings(id) on delete cascade,
  division_id uuid not null references divisions(id) on delete cascade,
  primary key (meeting_id, division_id)
);

insert into meeting_divisions (meeting_id, division_id)
select id, division_id from meetings where division_id is not null;

update meetings set visibility = 'private' where division_id is not null;

create or replace function can_view_meeting(p_meeting_id uuid, p_uid uuid)
returns boolean
language plpgsql security definer stable
set search_path = public
as $$
declare
  v_visibility text;
  v_created_by uuid;
begin
  select visibility, created_by into v_visibility, v_created_by
  from meetings where id = p_meeting_id;

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
    select 1 from meeting_divisions md
    where md.meeting_id = p_meeting_id
    and md.division_id = get_user_division(p_uid)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- meetings
-- ---------------------------------------------------------------------------

drop policy "meetings_select_authenticated" on meetings;
create policy "meetings_select_visible" on meetings
  for select using (auth.role() = 'authenticated' and can_view_meeting(id, auth.uid()));

drop policy "meetings_write_leader_admin" on meetings;
create policy "meetings_insert_leader_admin" on meetings
  for insert with check (
    created_by = auth.uid()
    and get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
  );
create policy "meetings_update_own_or_admin" on meetings
  for update using (
    created_by = auth.uid()
    or get_user_role(auth.uid()) in ('superadmin', 'admin')
  );
create policy "meetings_delete_admin" on meetings
  for delete using (get_user_role(auth.uid()) in ('superadmin', 'admin'));

-- ---------------------------------------------------------------------------
-- meeting_divisions
-- ---------------------------------------------------------------------------

alter table meeting_divisions enable row level security;

create policy "meeting_divisions_select_visible" on meeting_divisions
  for select using (auth.role() = 'authenticated' and can_view_meeting(meeting_id, auth.uid()));

create policy "meeting_divisions_insert_creator" on meeting_divisions
  for insert with check (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from meetings m
      where m.id = meeting_divisions.meeting_id and m.created_by = auth.uid()
    )
  );

create policy "meeting_divisions_delete_creator" on meeting_divisions
  for delete using (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from meetings m
      where m.id = meeting_divisions.meeting_id and m.created_by = auth.uid()
    )
  );

grant select, insert, delete on meeting_divisions to authenticated;

-- ---------------------------------------------------------------------------
-- Tabel turunan rapat (attendees/notulen/decisions/action_items) juga harus
-- ikut privasi -- tanpa ini, orang yang tidak di-include masih bisa baca
-- notulen/keputusan rapat privat lewat query langsung ke tabel tsb.
-- ---------------------------------------------------------------------------

drop policy "meeting_attendees_select_authenticated" on meeting_attendees;
create policy "meeting_attendees_select_visible" on meeting_attendees
  for select using (auth.role() = 'authenticated' and can_view_meeting(meeting_id, auth.uid()));

drop policy "meeting_attendees_upsert_own" on meeting_attendees;
create policy "meeting_attendees_upsert_own" on meeting_attendees
  for insert with check (user_id = auth.uid() and can_view_meeting(meeting_id, auth.uid()));

drop policy "notulen_select_authenticated" on notulen;
create policy "notulen_select_visible" on notulen
  for select using (auth.role() = 'authenticated' and can_view_meeting(meeting_id, auth.uid()));

drop policy "notulen_write_leader_admin" on notulen;
create policy "notulen_write_leader_admin" on notulen
  for all using (
    get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
    and can_view_meeting(meeting_id, auth.uid())
  );

-- decisions bisa berasal dari meeting ATAU thread forum (kolom thread_id
-- sudah ada sejak 0006) -- jaga supaya decisions dari thread tidak ikut
-- ketutup gara-gara meeting_id-nya kosong.
drop policy "decisions_select_authenticated" on decisions;
create policy "decisions_select_visible" on decisions
  for select using (
    auth.role() = 'authenticated'
    and (
      (meeting_id is not null and can_view_meeting(meeting_id, auth.uid()))
      or (thread_id is not null and can_view_thread(thread_id, auth.uid()))
      or (meeting_id is null and thread_id is null)
    )
  );

drop policy "decisions_write_leader_admin" on decisions;
create policy "decisions_write_leader_admin" on decisions
  for all using (
    get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
    and (meeting_id is null or can_view_meeting(meeting_id, auth.uid()))
    and (thread_id is null or can_view_thread(thread_id, auth.uid()))
  );

drop policy "action_items_select_authenticated" on action_items;
create policy "action_items_select_visible" on action_items
  for select using (
    auth.role() = 'authenticated'
    and (meeting_id is null or can_view_meeting(meeting_id, auth.uid()))
  );

drop policy "action_items_write_leader_admin" on action_items;
create policy "action_items_write_leader_admin" on action_items
  for all using (
    get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader')
    and (meeting_id is null or can_view_meeting(meeting_id, auth.uid()))
  );
-- action_items_update_own_assignee tetap tidak berubah -- yang ditugaskan
-- selalu boleh lihat/update task-nya sendiri, sama seperti kpi_tasks.
