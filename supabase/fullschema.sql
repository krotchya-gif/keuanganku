-- Keuanganku canonical schema backup / source of truth
--
-- Checked against the live Supabase project on 2026-09-05 using Supabase MCP.
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
\ir migrations/20260904130039_add_transaction_accounts.sql
\ir migrations/20260904132915_add_savings_transfer_workflow.sql
\ir migrations/20260904133352_enforce_account_balances.sql
\ir migrations/20260905012415_add_recurring_transactions.sql
\ir migrations/20260905012522_index_recurring_transaction_account.sql
\ir migrations/20260905012930_migrate_cashflow_items_to_recurring.sql
\ir migrations/20260905012955_generate_due_recurring_transactions.sql
\ir migrations/20260905014254_link_recurring_to_budget.sql
\ir migrations/20260905014411_schedule_recurring_transactions.sql
\ir migrations/20260905015126_harden_rls_and_functions.sql
\ir migrations/20260905020417_atomic_savings_transfer.sql
\ir migrations/20260905020627_atomic_bill_payment.sql
\ir migrations/20260905020810_link_bill_to_debt.sql
\ir migrations/20260905021145_harden_savings_consistency.sql
\ir migrations/20260905021209_recurring_savings_generation.sql
\ir migrations/20260905022957_add_crypto_holdings.sql

-- Live-only operational objects from migration 003 (pg_cron/pg_net, Vault
-- secrets, and the snapshot-networth-monthly job) are managed separately.
