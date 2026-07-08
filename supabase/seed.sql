-- Seed: 10 divisi awal.
--
-- ⚠️ BELUM DIKONFIRMASI ke pemilik bisnis: apakah "Affiliator" dan
-- "Affiliator TikTok" adalah dua divisi yang benar-benar terpisah (mis.
-- Affiliator = marketplace lain seperti Shopee), atau perlu rename. Nama di
-- bawah ini dipakai apa adanya dari notebook sumber — update baris terkait
-- lalu re-run sebelum dianggap final.

insert into divisions (name, category) values
  ('IT', 'Internal'),
  ('Purchasing', 'Internal'),
  ('Affiliator', 'Marketplace'),           -- TODO: konfirmasi nama (lihat catatan di atas)
  ('Marketing Shopee', 'Marketplace'),
  ('Marketing TikTok', 'Marketplace'),
  ('Affiliator TikTok', 'Marketplace'),    -- TODO: konfirmasi nama (lihat catatan di atas)
  ('Inbound', 'Gudang'),
  ('Restock', 'Gudang'),
  ('Operasional', 'Gudang'),
  ('Customer Service', 'Support')
on conflict (name) do nothing;
