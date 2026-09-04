-- ============================================================
-- MIGRATION 005: Seed kategori (dompet) default
-- ============================================================
-- Tujuan: user baru langsung punya kategori pengeluaran & pemasukan
-- (makan, belanja, gaji, tagihan, dll) sehingga tidak perlu membuat
-- kategori sendiri sebelum bisa mencatat transaksi.
--
-- Daftar identik dengan DEFAULT_BUDGET_ITEMS di
-- src/shared/constants/index.ts — ubah keduanya bersamaan.
--
-- Cara pakai: jalankan sekali di Supabase SQL Editor (idempotent,
-- aman dijalankan ulang).

-- ===== 1) Trigger: user baru otomatis dapat kategori bawaan =====
CREATE OR REPLACE FUNCTION public.seed_default_budget_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO budget_items (user_id, name, category, sort_order) VALUES
    -- PENDAPATAN
    (NEW.id, 'Gaji',                              'PENDAPATAN',          1),
    (NEW.id, 'Side Hustle',                       'PENDAPATAN',          2),
    (NEW.id, 'Hasil Investasi',                   'PENDAPATAN',          3),
    (NEW.id, 'Cashback',                          'PENDAPATAN',          4),
    -- TABUNGAN & INVESTASI
    (NEW.id, 'Top Up Investasi',                  'TABUNGAN_INVESTASI',  5),
    (NEW.id, 'Tabungan Darurat',                  'TABUNGAN_INVESTASI',  6),
    (NEW.id, 'Tabungan Tujuan',                   'TABUNGAN_INVESTASI',  7),
    -- TAGIHAN
    (NEW.id, 'IPL / Biaya Apartemen',             'TAGIHAN',             8),
    (NEW.id, 'Sewa Tempat Tinggal',               'TAGIHAN',             9),
    (NEW.id, 'Listrik',                           'TAGIHAN',            10),
    (NEW.id, 'Air',                               'TAGIHAN',            11),
    (NEW.id, 'BPJS Kesehatan',                    'TAGIHAN',            12),
    (NEW.id, 'Internet / Pulsa',                  'TAGIHAN',            13),
    (NEW.id, 'Langganan (Netflix, Spotify, dll)', 'TAGIHAN',            14),
    -- BIAYA OPERASIONAL
    (NEW.id, 'Konsumsi / Makan',                  'BIAYA_OPERASIONAL',  15),
    (NEW.id, 'Transportasi',                      'BIAYA_OPERASIONAL',  16),
    (NEW.id, 'Belanja Bulanan',                   'BIAYA_OPERASIONAL',  17),
    (NEW.id, 'Skincare / Perawatan',              'BIAYA_OPERASIONAL',  18),
    (NEW.id, 'Hiburan / Sosial',                  'BIAYA_OPERASIONAL',  19),
    (NEW.id, 'Pendidikan',                        'BIAYA_OPERASIONAL',  20),
    -- HUTANG
    (NEW.id, 'Cicilan Kartu Kredit',              'HUTANG',             21),
    (NEW.id, 'Cicilan Pinjaman Pribadi',          'HUTANG',             22),
    (NEW.id, 'Cicilan KPR',                       'HUTANG',             23),
    (NEW.id, 'Cicilan Kendaraan',                 'HUTANG',             24);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_user_created_seed_budget_items ON public.users;
CREATE TRIGGER on_user_created_seed_budget_items
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_budget_items();

-- ===== 2) Backfill: user lama yang belum punya kategori apa pun =====
-- User yang sudah menyusun kategorinya sendiri TIDAK disentuh.
INSERT INTO budget_items (user_id, name, category, sort_order)
SELECT
  u.id,
  v.name,
  v.category::budget_category,
  v.sort_order
FROM public.users u
CROSS JOIN (VALUES
  ('Gaji',                              'PENDAPATAN',          1),
  ('Side Hustle',                       'PENDAPATAN',          2),
  ('Hasil Investasi',                   'PENDAPATAN',          3),
  ('Cashback',                          'PENDAPATAN',          4),
  ('Top Up Investasi',                  'TABUNGAN_INVESTASI',  5),
  ('Tabungan Darurat',                  'TABUNGAN_INVESTASI',  6),
  ('Tabungan Tujuan',                   'TABUNGAN_INVESTASI',  7),
  ('IPL / Biaya Apartemen',             'TAGIHAN',             8),
  ('Sewa Tempat Tinggal',               'TAGIHAN',             9),
  ('Listrik',                           'TAGIHAN',            10),
  ('Air',                               'TAGIHAN',            11),
  ('BPJS Kesehatan',                    'TAGIHAN',            12),
  ('Internet / Pulsa',                  'TAGIHAN',            13),
  ('Langganan (Netflix, Spotify, dll)', 'TAGIHAN',            14),
  ('Konsumsi / Makan',                  'BIAYA_OPERASIONAL',  15),
  ('Transportasi',                      'BIAYA_OPERASIONAL',  16),
  ('Belanja Bulanan',                   'BIAYA_OPERASIONAL',  17),
  ('Skincare / Perawatan',              'BIAYA_OPERASIONAL',  18),
  ('Hiburan / Sosial',                  'BIAYA_OPERASIONAL',  19),
  ('Pendidikan',                        'BIAYA_OPERASIONAL',  20),
  ('Cicilan Kartu Kredit',              'HUTANG',             21),
  ('Cicilan Pinjaman Pribadi',          'HUTANG',             22),
  ('Cicilan KPR',                       'HUTANG',             23),
  ('Cicilan Kendaraan',                 'HUTANG',             24)
) AS v(name, category, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM budget_items b WHERE b.user_id = u.id
);
