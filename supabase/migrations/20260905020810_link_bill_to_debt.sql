ALTER TABLE public.budget_items ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES public.debts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_budget_items_debt ON public.budget_items(debt_id);
UPDATE public.budget_items b SET debt_id = d.id FROM public.debts d
WHERE b.user_id=d.user_id AND b.category='HUTANG' AND b.debt_id IS NULL
  AND (lower(b.name) LIKE '%' || lower(d.name) || '%' OR lower(d.name) LIKE '%' || lower(b.name) || '%');

CREATE OR REPLACE FUNCTION public.record_bill_payment(p_budget_item_id uuid, p_account_id uuid, p_date date, p_amount numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
DECLARE uid uuid := (select auth.uid()); item RECORD; tx_id uuid; period date; payment_amount numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT b.*, d.id AS linked_debt_id INTO item FROM public.budget_items b LEFT JOIN public.debts d ON d.id=b.debt_id AND d.user_id=uid WHERE b.id=p_budget_item_id AND b.user_id=uid AND b.category IN ('TAGIHAN','HUTANG');
  IF NOT FOUND THEN RAISE EXCEPTION 'Tagihan tidak valid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id=p_account_id AND user_id=uid AND is_active) THEN RAISE EXCEPTION 'Rekening pembayaran tidak valid'; END IF;
  payment_amount := COALESCE(p_amount, item.amount); IF payment_amount <= 0 THEN RAISE EXCEPTION 'Nominal pembayaran tidak valid'; END IF;
  period := date_trunc('month', p_date)::date;
  IF EXISTS (SELECT 1 FROM public.transactions WHERE user_id=uid AND budget_item_id=p_budget_item_id AND billing_period=period) THEN RAISE EXCEPTION 'Tagihan sudah dibayar pada periode ini'; END IF;
  INSERT INTO public.transactions (user_id, account_id, budget_item_id, billing_period, transaction_date, amount, category, subcategory, description, transaction_type)
    VALUES (uid, p_account_id, p_budget_item_id, period, p_date, payment_amount, item.category, item.name, 'Pembayaran ' || item.name, 'expense') RETURNING id INTO tx_id;
  IF item.category='HUTANG' AND item.linked_debt_id IS NOT NULL THEN UPDATE public.debts SET total_amount = greatest(total_amount - payment_amount, 0) WHERE id=item.linked_debt_id AND user_id=uid; END IF;
  RETURN tx_id;
END; $fn$;
