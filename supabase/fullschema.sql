-- Keuanganku canonical schema backup / source of truth
--
-- Checked against the live Supabase project on 2026-09-04 using Supabase MCP.
-- Keep this file synchronized after every live database mutation. The included
-- migrations define the current live state; local migration history may be
-- incomplete because the original baseline was applied manually.
--
-- This file intentionally excludes 002_seed_data.sql and the secret-bearing
-- portions of 003_cron_snapshot.sql. Those are data/operational setup, not the
-- application schema, and must never be replayed as a schema baseline.

\ir migrations/001_initial_schema.sql
\ir migrations/004_dana_darat_flag.sql
\ir migrations/005_seed_default_categories.sql
\ir migrations/20260904115104_add_onboarding_accounts.sql

-- Live-only operational objects from migration 003 (pg_cron/pg_net, Vault
-- secrets, and the snapshot-networth-monthly job) are managed separately.
