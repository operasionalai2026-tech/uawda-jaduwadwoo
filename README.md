# Sistem Internal Operasional

Next.js (App Router) + Supabase. Fase 1: fondasi (auth, roles, divisi, profil) + modul KPI.

## Status

- ✅ Auth (email/password + magic link), proxy (auth gate) di `proxy.ts`
- ✅ Skema `divisions`, `profiles`, `user_roles` + RLS (`supabase/migrations/0001_foundation.sql`)
- ✅ Skema KPI + RLS (`supabase/migrations/0002_kpi.sql`)
- ✅ Seed 10 divisi (`supabase/seed.sql`) — **lihat catatan di file itu, ada 2 nama divisi yang belum dikonfirmasi ke pemilik bisnis**
- ✅ Modul KPI: CRUD metric, input entries, skor komposit per divisi
- ⏳ Belum: modul Evaluasi (Fase 2), Forum & Meeting (Fase 3), rekaman + transkripsi AI (Fase 4), dashboard Command Center penuh

## Setup

1. Buat project di [supabase.com](https://supabase.com) (atau pakai project yang sudah ada).
2. Copy `.env.local.example` ke `.env.local`, isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` dari dashboard Supabase (Project Settings → API).
3. Link & push migrasi:

   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

   > Catatan: Docker tidak tersedia di environment ini, jadi `supabase start` (stack lokal) tidak dipakai — migrasi langsung ditarget ke project cloud via `db push`.

4. Jalankan seed (setelah konfirmasi nama divisi di `supabase/seed.sql`):

   ```bash
   npx supabase db execute -f supabase/seed.sql
   ```

5. Buat user pertama (superadmin) lewat Supabase Auth dashboard, lalu insert manual ke `user_roles`:

   ```sql
   insert into user_roles (user_id, role) values ('<uid-user>', 'superadmin');
   insert into profiles (id, full_name) values ('<uid-user>', 'Nama Owner');
   ```

6. Install & jalankan dev server:

   ```bash
   npm install
   npm run dev
   ```

## Struktur

- `proxy.ts` — auth gate (Next.js 16 renamed `middleware.ts` → `proxy.ts`; lihat `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`)
- `src/lib/supabase/` — client browser/server/proxy helper
- `src/lib/auth.ts` — `getCurrentUser()`, baca role dari `user_roles`
- `src/app/(app)/` — halaman yang butuh login (layout dengan nav + role)
- `src/app/(app)/kpi/` — modul KPI
- `supabase/migrations/` — skema SQL, urut sesuai nomor file
- `supabase/seed.sql` — seed 10 divisi
