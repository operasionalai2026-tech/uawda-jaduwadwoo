-- Seed: 15 divisi (sinkron dengan daftar final dari pemilik bisnis, Jul 2026).
-- "Affiliator" lama sudah dihapus dari daftar — jangan ditambahkan lagi.

insert into divisions (name, category) values
  ('IT', 'Internal'),
  ('Purchasing', 'Internal'),
  ('Accounting', 'Internal'),
  ('Marketing Shopee', 'Marketplace'),
  ('Marketing TikTok', 'Marketplace'),
  ('Affiliator TikTok', 'Marketplace'),
  ('Inbound', 'Gudang'),
  ('Restock', 'Gudang'),
  ('Operasional', 'Gudang'),
  ('Customer Service', 'Support'),
  ('Admin Cs', 'Support'),
  ('Haven Office', 'Haven'),
  ('Haven Produksi', 'Haven'),
  ('Design', 'Kreatif'),
  ('Konten / Live', 'Kreatif')
on conflict (name) do nothing;
