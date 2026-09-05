CREATE INDEX IF NOT EXISTS idx_recurring_transactions_account
  ON public.recurring_transactions(account_id);
