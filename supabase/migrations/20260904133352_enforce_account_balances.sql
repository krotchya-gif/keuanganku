CREATE OR REPLACE FUNCTION public.apply_transaction_to_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_balance NUMERIC;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.account_id IS NOT NULL THEN
      UPDATE public.accounts SET balance = balance + CASE WHEN COALESCE(OLD.transaction_type, 'expense') = 'income' THEN -OLD.amount ELSE OLD.amount END WHERE id = OLD.account_id AND user_id = OLD.user_id;
    END IF;
    IF OLD.transfer_to_account_id IS NOT NULL AND COALESCE(OLD.transaction_type, 'expense') = 'transfer' THEN
      UPDATE public.accounts SET balance = balance - OLD.amount WHERE id = OLD.transfer_to_account_id AND user_id = OLD.user_id;
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.account_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.account_id AND user_id = NEW.user_id AND is_active) THEN RAISE EXCEPTION 'Rekening sumber tidak valid'; END IF;
      IF COALESCE(NEW.transaction_type, 'expense') IN ('expense', 'transfer') THEN
        SELECT balance INTO source_balance FROM public.accounts WHERE id = NEW.account_id FOR UPDATE;
        IF source_balance < NEW.amount THEN RAISE EXCEPTION 'Saldo rekening sumber tidak mencukupi'; END IF;
        UPDATE public.accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
      ELSE
        UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
      END IF;
    END IF;
    IF COALESCE(NEW.transaction_type, 'expense') = 'transfer' THEN
      IF NEW.transfer_to_account_id IS NULL OR NEW.transfer_to_account_id = NEW.account_id THEN RAISE EXCEPTION 'Rekening tujuan transfer tidak valid'; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id = NEW.transfer_to_account_id AND user_id = NEW.user_id AND is_active) THEN RAISE EXCEPTION 'Rekening tujuan tidak valid'; END IF;
      UPDATE public.accounts SET balance = balance + NEW.amount WHERE id = NEW.transfer_to_account_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS apply_transaction_to_accounts ON public.transactions;
CREATE TRIGGER apply_transaction_to_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_to_accounts();

REVOKE EXECUTE ON FUNCTION public.apply_transaction_to_accounts() FROM PUBLIC, anon, authenticated;
