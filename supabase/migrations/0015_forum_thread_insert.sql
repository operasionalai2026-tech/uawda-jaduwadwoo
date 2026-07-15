-- Fase 10: samakan aturan insert thread dengan model baru.
--
-- Di model lama hanya Leader/Management/Owner yang boleh membuat thread privat.
-- Di model baru "Type Thread" Internal = privat ke divisi sendiri dan SEMUA
-- peran (termasuk Staff) boleh mengajukan thread Idea/Improvement/Issue, baik
-- Internal maupun Global. Syaratnya tetap: created_by = user sendiri.
--
-- Aman dijalankan berkali-kali.

drop policy if exists "forum_threads_insert_authenticated" on forum_threads;
drop policy if exists "forum_threads_insert_public" on forum_threads;
drop policy if exists "forum_threads_insert_private" on forum_threads;
drop policy if exists "forum_threads_insert_own" on forum_threads;

create policy "forum_threads_insert_own" on forum_threads
  for insert with check (
    auth.role() = 'authenticated' and created_by = auth.uid()
  );
