-- ============================================================
-- MIGRATION 004: Add is_emergency_fund flag to assets
-- ============================================================

ALTER TABLE assets
  ADD COLUMN is_emergency_fund BOOLEAN DEFAULT FALSE;

-- Update existing "Dana Darurat" assets (set flag untuk data lama)
UPDATE assets
  SET is_emergency_fund = TRUE
  WHERE category = 'kas_setara_kas'
    AND LOWER(name) LIKE '%dana darurat%';
