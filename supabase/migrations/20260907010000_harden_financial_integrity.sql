-- Keep savings goal progress derived from actual transfer transactions.
CREATE OR REPLACE FUNCTION public.recalculate_savings_goal(p_goal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM set_config('keuanganku.allow_savings_goal_recalc', 'on', true);
  UPDATE public.savings_goals g
  SET current_amount = COALESCE((
    SELECT SUM(t.amount)
    FROM public.transactions t
    WHERE t.savings_goal_id = g.id
      AND t.transaction_type = 'transfer'
      AND t.transfer_to_account_id IS NOT NULL
  ), 0)
  WHERE g.id = p_goal_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.protect_savings_goal_current_amount()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF NEW.current_amount IS DISTINCT FROM OLD.current_amount
     AND current_setting('keuanganku.allow_savings_goal_recalc', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'current_amount adalah field turunan transaksi dan tidak dapat diubah langsung';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS protect_savings_goal_current_amount ON public.savings_goals;
CREATE TRIGGER protect_savings_goal_current_amount
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW EXECUTE FUNCTION public.protect_savings_goal_current_amount();

-- Prevent cross-user references for financial relations used by the app.
CREATE OR REPLACE FUNCTION public.validate_financial_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Rekening transaksi tidak valid'; END IF;
    IF NEW.transfer_to_account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE id = NEW.transfer_to_account_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Rekening tujuan transaksi tidak valid'; END IF;
    IF NEW.savings_goal_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.savings_goals WHERE id = NEW.savings_goal_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Target tabungan transaksi tidak valid'; END IF;
    IF NEW.budget_item_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.budget_items WHERE id = NEW.budget_item_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Pos anggaran transaksi tidak valid'; END IF;
  ELSIF TG_TABLE_NAME = 'recurring_transactions' THEN
    IF NEW.account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Rekening transaksi rutin tidak valid'; END IF;
    IF NEW.transfer_to_account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE id = NEW.transfer_to_account_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Rekening tujuan transaksi rutin tidak valid'; END IF;
    IF NEW.savings_goal_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.savings_goals WHERE id = NEW.savings_goal_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Target tabungan transaksi rutin tidak valid'; END IF;
  ELSIF TG_TABLE_NAME = 'crypto_holdings' THEN
    IF NEW.account_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Rekening crypto tidak valid'; END IF;
  ELSIF TG_TABLE_NAME = 'budget_items' THEN
    IF NEW.debt_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.debts WHERE id = NEW.debt_id AND user_id = NEW.user_id
    ) THEN RAISE EXCEPTION 'Utang pada pos anggaran tidak valid'; END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS validate_transactions_ownership ON public.transactions;
CREATE TRIGGER validate_transactions_ownership
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_financial_ownership();

DROP TRIGGER IF EXISTS validate_recurring_transactions_ownership ON public.recurring_transactions;
CREATE TRIGGER validate_recurring_transactions_ownership
BEFORE INSERT OR UPDATE ON public.recurring_transactions
FOR EACH ROW EXECUTE FUNCTION public.validate_financial_ownership();

DROP TRIGGER IF EXISTS validate_crypto_holdings_ownership ON public.crypto_holdings;
CREATE TRIGGER validate_crypto_holdings_ownership
BEFORE INSERT OR UPDATE ON public.crypto_holdings
FOR EACH ROW EXECUTE FUNCTION public.validate_financial_ownership();

DROP TRIGGER IF EXISTS validate_budget_items_ownership ON public.budget_items;
CREATE TRIGGER validate_budget_items_ownership
BEFORE INSERT OR UPDATE ON public.budget_items
FOR EACH ROW EXECUTE FUNCTION public.validate_financial_ownership();

REVOKE EXECUTE ON FUNCTION public.protect_savings_goal_current_amount() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_financial_ownership() FROM PUBLIC, anon, authenticated;

-- PostgreSQL 15+ treats NULL account_id values as equal for this key.
ALTER TABLE public.crypto_holdings
  DROP CONSTRAINT IF EXISTS crypto_holdings_user_id_coin_id_account_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS crypto_holdings_user_coin_account_unique
  ON public.crypto_holdings (user_id, coin_id, account_id) NULLS NOT DISTINCT;
