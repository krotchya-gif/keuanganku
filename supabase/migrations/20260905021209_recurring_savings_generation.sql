CREATE OR REPLACE FUNCTION public.generate_all_due_recurring_transactions()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE item RECORD; n INTEGER:=0; c public.budget_category;
BEGIN
 FOR item IN SELECT * FROM public.recurring_transactions WHERE is_active AND next_run_date<=CURRENT_DATE FOR UPDATE LOOP
  c:=CASE item.category WHEN 'pendapatan' THEN 'PENDAPATAN'::public.budget_category WHEN 'masa_depan_investasi' THEN 'TABUNGAN_INVESTASI'::public.budget_category WHEN 'kewajiban_cicilan' THEN 'HUTANG'::public.budget_category ELSE 'BIAYA_OPERASIONAL'::public.budget_category END;
  INSERT INTO public.transactions(user_id,account_id,transfer_to_account_id,savings_goal_id,transaction_date,amount,category,transaction_type,description) VALUES(item.user_id,item.account_id,item.transfer_to_account_id,item.savings_goal_id,item.next_run_date,item.amount,c,item.transaction_type,item.name);
  UPDATE public.recurring_transactions SET last_generated_at=now(),next_run_date=CASE WHEN item.frequency='yearly' THEN (item.next_run_date+interval '1 year')::date ELSE (item.next_run_date+interval '1 month')::date END WHERE id=item.id; n:=n+1;
 END LOOP; RETURN n;
END; $fn$;
