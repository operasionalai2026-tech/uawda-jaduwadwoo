-- Fitur hapus thread / rapat / evaluasi untuk Owner (superadmin),
-- Management (admin), dan Lead (leader). Staff tidak boleh menghapus.

-- forum_threads: sebelumnya TIDAK punya policy DELETE sama sekali
-- (default-deny), jadi tidak ada yang bisa menghapus thread.
drop policy if exists "forum_threads_delete_leader_admin" on forum_threads;
create policy "forum_threads_delete_leader_admin" on forum_threads
  for delete using (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));

-- decisions.thread_id semula NO ACTION -- menghalangi penghapusan thread
-- yang punya keputusan. Keputusan tetap disimpan, referensi thread di-null-kan.
alter table decisions drop constraint decisions_thread_id_fkey;
alter table decisions add constraint decisions_thread_id_fkey
  foreign key (thread_id) references forum_threads(id) on delete set null;

-- meetings: sebelumnya hanya superadmin/admin; tambahkan leader.
drop policy if exists "meetings_delete_admin" on meetings;
drop policy if exists "meetings_delete_leader_admin" on meetings;
create policy "meetings_delete_leader_admin" on meetings
  for delete using (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));

-- retros: sebelumnya evaluator sendiri atau superadmin/admin; tambahkan
-- leader untuk retro di divisinya sendiri.
drop policy if exists "retros_delete_own_or_admin" on retros;
drop policy if exists "retros_delete_leader_admin" on retros;
create policy "retros_delete_leader_admin" on retros
  for delete using (
    evaluator_id = auth.uid()
    or get_user_role(auth.uid()) in ('superadmin', 'admin')
    or (
      get_user_role(auth.uid()) = 'leader'
      and division_id = get_user_division(auth.uid())
    )
  );
