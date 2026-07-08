-- Fase 4: Rekaman Meeting + Transkripsi + Ringkasan AI (schema only)
--
-- Ini HANYA skema tabel. Pipeline yang sebenarnya (upload audio progresif,
-- job async transkripsi, ringkasan AI) belum diimplementasikan - itu perlu:
--   1. Bucket Supabase Storage privat "meeting-recordings"
--   2. Whisper API key (transkripsi)
--   3. Claude API key (ringkasan terstruktur dari transkrip)
--   4. Fonnte token (notifikasi WhatsApp saat notulen siap)
--   5. Job runner async (Supabase Edge Function / queue terpisah) - TIDAK
--      boleh dijalankan sinkron di satu API route Vercel karena meeting
--      panjang bisa makan waktu lebih dari timeout function.
-- Lihat notebook section 6 untuk alur lengkap. Modul ini sengaja belum
-- dihubungkan ke UI sampai kredensial di atas tersedia.

create table meeting_recordings (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade unique,
  storage_path text not null,
  duration_seconds int,
  status text not null default 'recorded'
    check (status in ('recorded', 'transcribing', 'transcribed', 'summarizing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz default now()
);

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references meeting_recordings(id) on delete cascade unique,
  raw_text text,
  segments jsonb,
  provider text,
  created_at timestamptz default now()
);

alter table meeting_recordings enable row level security;
alter table transcripts enable row level security;

-- Privasi: audio mentah hanya untuk peserta meeting + superadmin, bukan
-- semua staff (per notebook section 6 - "staff lain hanya lihat notulen").
create policy "recordings_select_participant_or_admin" on meeting_recordings
  for select using (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from meeting_attendees ma
      where ma.meeting_id = meeting_recordings.meeting_id
      and ma.user_id = auth.uid()
    )
  );
create policy "recordings_write_admin_leader" on meeting_recordings
  for insert with check (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));
create policy "recordings_update_admin_leader" on meeting_recordings
  for update using (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));

create policy "transcripts_select_participant_or_admin" on transcripts
  for select using (
    get_user_role(auth.uid()) = 'superadmin'
    or exists (
      select 1 from meeting_recordings mr
      join meeting_attendees ma on ma.meeting_id = mr.meeting_id
      where mr.id = transcripts.recording_id
      and ma.user_id = auth.uid()
    )
  );
create policy "transcripts_write_admin_leader" on transcripts
  for all using (get_user_role(auth.uid()) in ('superadmin', 'admin', 'leader'));

grant select, insert, update, delete on meeting_recordings, transcripts to authenticated;

-- Hasil ringkasan AI otomatis mengisi notulen.content, decisions, dan
-- action_items dengan flag source agar bisa dibedakan dari input manual.
-- (notulen/decisions/action_items sudah punya kolom `source` sejak 0006.)
