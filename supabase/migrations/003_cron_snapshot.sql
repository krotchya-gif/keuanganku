-- ============================================================
-- MIGRATION 003: Auto-Snapshot Net Worth via pg_cron
-- Jalankan di Supabase SQL Editor setelah deploy edge function
-- Membutuhkan: Supabase Pro plan (pg_cron + pg_net)
-- ============================================================

-- 1. Enable ekstensi (skip kalo sudah ada)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Simpan service_role_key di Vault
-- ⚠️  GANTI 'your-service-role-key' dengan key dari:
--      Project Settings → API → service_role key
SELECT vault.create_secret('your-service-role-key', 'service_role_key');

-- 3. Simpan project URL di Vault
-- ⚠️  GANTI 'https://YOUR_PROJECT.supabase.co' dengan URL project-mu
SELECT vault.create_secret('https://ogupmtptmepxfkedbmcv.supabase.co', 'project_url');

-- 4. Jadwalkan snapshot tiap tanggal 1 jam 00:00
SELECT cron.schedule(
  'snapshot-networth-monthly',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    )
  ) AS request_id;
  $$
);

-- 5. Verifikasi (opsional)
SELECT jobid, jobname, schedule FROM cron.job;
