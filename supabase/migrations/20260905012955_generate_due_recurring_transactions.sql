CREATE OR REPLACE FUNCTION public.generate_due_recurring_transactions()
RETURNS INTEGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE item RECORD; created_count INTEGER := 0; tx_category public.budget_category;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  FOR item IN SELECT * FROM public.recurring_transactions
    WHERE user_id = (select auth.uid()) AND is_active AND next_run_date <= CURRENT_DATE FOR UPDATE LOOP
    tx_category := CASE item.category
      WHEN 'pendapatan' THEN 'PENDAPATAN'::public.budget_category
      WHEN 'masa_depan_investasi' THEN 'TABUNGAN_INVESTASI'::public.budget_category
      WHEN 'kewajiban_cicilan' THEN 'HUTANG'::public.budget_category
      ELSE 'BIAYA_OPERASIONAL'::public.budget_category END;
    INSERT INTO public.transactions (user_id, account_id, transaction_date, amount, category, transaction_type, description)
      VALUES (item.user_id, item.account_id, item.next_run_date, item.amount, tx_category,
        CASE WHEN item.direction = 'masuk' THEN 'income' ELSE 'expense' END, item.name);
    UPDATE public.recurring_transactions SET last_generated_at = now(), next_run_date = CASE WHEN item.frequency = 'yearly'
      THEN (item.next_run_date + interval '1 year')::date ELSE (item.next_run_date + interval '1 month')::date END WHERE id = item.id;
    created_count := created_count + 1;
  END LOOP; RETURN created_count;
END; $$;
REVOKE EXECUTE ON FUNCTION public.generate_due_recurring_transactions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_due_recurring_transactions() TO authenticated;
