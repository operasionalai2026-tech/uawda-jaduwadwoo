-- Bucket Storage privat "meeting-recordings" (lihat catatan di 0007) tidak
-- pernah benar-benar dibuat -- auto-create di runtime (route.ts) diam-diam
-- gagal karena errornya tidak diperiksa. Penyebabnya: kode meminta
-- file_size_limit 100MB, melebihi batas upload maksimum project Supabase,
-- sehingga createBucket() selalu gagal dan setiap upload chunk rekaman rapat
-- error "Bucket not found". Buat langsung lewat migrasi tanpa file_size_limit
-- eksplisit (pakai batas global project) supaya tidak kena masalah yang sama.
insert into storage.buckets (id, name, public)
values ('meeting-recordings', 'meeting-recordings', false)
on conflict (id) do nothing;
