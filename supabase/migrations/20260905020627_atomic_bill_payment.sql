ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS billing_period DATE;
CREATE INDEX IF NOT EXISTS idx_transactions_budget_period ON public.transactions(user_id, budget_item_id, billing_period);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_one_bill_payment ON public.transactions(user_id, budget_item_id, billing_period) WHERE budget_item_id IS NOT NULL AND billing_period IS NOT NULL;
CREATE OR REPLACE FUNCTION public.record_bill_payment(p_budget_item_id uuid, p_account_id uuid, p_date date, p_amount numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
DECLARE uid uuid := (select auth.uid()); item RECORD; tx_id uuid; period date;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO item FROM public.budget_items WHERE id=p_budget_item_id AND user_id=uid AND category IN ('TAGIHAN','HUTANG');
  IF NOT FOUND THEN RAISE EXCEPTION 'Tagihan tidak valid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id=p_account_id AND user_id=uid AND is_active) THEN RAISE EXCEPTION 'Rekening pembayaran tidak valid'; END IF;
  period := date_trunc('month', p_date)::date;
  IF EXISTS (SELECT 1 FROM public.transactions WHERE user_id=uid AND budget_item_id=p_budget_item_id AND billing_period=period) THEN RAISE EXCEPTION 'Tagihan sudah dibayar pada periode ini'; END IF;
  INSERT INTO public.transactions (user_id, account_id, budget_item_id, billing_period, transaction_date, amount, category, subcategory, description, transaction_type)
    VALUES (uid, p_account_id, p_budget_item_id, period, p_date, COALESCE(p_amount, item.amount), item.category, item.name, 'Pembayaran ' || item.name, 'expense') RETURNING id INTO tx_id;
  RETURN tx_id;
END; $fn$;
REVOKE EXECUTE ON FUNCTION public.record_bill_payment(uuid,uuid,date,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_bill_payment(uuid,uuid,date,numeric) TO authenticated;
