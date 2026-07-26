-- ============================================================
-- Setup cron schedule untuk auto-snapshot Net Worth
-- Jalankan di Supabase SQL Editor setelah deploy edge function
-- ============================================================

-- 1. Simpan service role key di Vault (hanya sekali)
-- Ganti 'YOUR_SERVICE_ROLE_KEY' dengan key dari Project Settings > API > service_role key
SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');

-- 2. Simpan project URL di Vault (hanya sekali)
-- Ganti 'https://YOUR_PROJECT.supabase.co' dengan URL project-mu
SELECT vault.create_secret('https://ogupmtptmepxfkedbmcv.supabase.co', 'project_url');

-- 3. Buat cron job: jalan tiap tanggal 1 bulan 00:00
SELECT cron.schedule(
  'snapshot-networth-monthly',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    )
  ) AS request_id;
  $$
);

-- 4. Lihat jadwal yang aktif (opsional, cek aja)
SELECT * FROM cron.job;

-- 5. Hapus cron job jika perlu (jalanin kalo mau stop)
-- SELECT cron.unschedule('snapshot-networth-monthly');
