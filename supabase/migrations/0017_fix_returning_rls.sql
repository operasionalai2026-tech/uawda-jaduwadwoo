-- Fix: "new row violates row-level security policy" saat INSERT thread/rapat.
--
-- Root cause (bukan di INSERT policy -- 0015/0016 mengejar tempat yang salah):
-- app memakai .insert(...).select("id") = INSERT ... RETURNING. PostgreSQL
-- mengevaluasi SELECT policy untuk row yang di-RETURNING. SELECT policy lama
-- memanggil can_view_thread()/can_view_meeting() yang membaca ULANG tabelnya
-- sendiri -- padahal row baru belum terlihat di snapshot fungsi selama
-- statement INSERT masih berjalan -> fungsi balas false -> error 42501.
--
-- Fix: tulis ulang SELECT policy secara inline pada kolom row-nya sendiri
-- (dievaluasi langsung di tuple, tidak perlu re-query). Semantik privasi
-- tidak berubah. can_view_thread()/can_view_meeting() TETAP dipakai oleh
-- policy tabel lain (posts, junction, notulen, dll) -- di sana mereka
-- membaca row LAIN yang sudah committed, jadi aman.

-- forum_threads
drop policy if exists "forum_threads_select_visible" on forum_threads;
create policy "forum_threads_select_visible" on forum_threads
  for select using (
    auth.role() = 'authenticated'
    and (
      visibility = 'public'
      or created_by = auth.uid()
      or get_user_role(auth.uid()) = 'superadmin'
      or exists (
        select 1 from forum_thread_divisions ftd
        where ftd.thread_id = forum_threads.id
        and ftd.division_id = get_user_division(auth.uid())
      )
    )
  );

-- meetings
drop policy if exists "meetings_select_visible" on meetings;
create policy "meetings_select_visible" on meetings
  for select using (
    auth.role() = 'authenticated'
    and (
      visibility = 'public'
      or created_by = auth.uid()
      or get_user_role(auth.uid()) = 'superadmin'
      or exists (
        select 1 from meeting_divisions md
        where md.meeting_id = meetings.id
        and md.division_id = get_user_division(auth.uid())
      )
    )
  );
