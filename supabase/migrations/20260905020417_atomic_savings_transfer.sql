CREATE OR REPLACE FUNCTION public.record_savings_transfer(p_goal_id uuid, p_amount numeric, p_source_account_id uuid, p_destination_account_id uuid, p_date date)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $fn$
DECLARE tx_id uuid; uid uuid := (select auth.uid());
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount <= 0 OR p_source_account_id = p_destination_account_id THEN RAISE EXCEPTION 'Transfer tidak valid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.savings_goals WHERE id=p_goal_id AND user_id=uid) THEN RAISE EXCEPTION 'Target tabungan tidak valid'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.accounts WHERE id=p_source_account_id AND user_id=uid AND is_active) OR NOT EXISTS (SELECT 1 FROM public.accounts WHERE id=p_destination_account_id AND user_id=uid AND is_active) THEN RAISE EXCEPTION 'Rekening transfer tidak valid'; END IF;
  INSERT INTO public.transactions (user_id, transaction_date, amount, category, subcategory, description, transaction_type, account_id, transfer_to_account_id, savings_goal_id)
    VALUES (uid, p_date, p_amount, 'TABUNGAN_INVESTASI', 'Setoran tabungan', 'Transfer ke target tabungan', 'transfer', p_source_account_id, p_destination_account_id, p_goal_id) RETURNING id INTO tx_id;
  UPDATE public.savings_goals SET current_amount = current_amount + p_amount WHERE id=p_goal_id AND user_id=uid;
  RETURN tx_id;
END; $fn$;
REVOKE EXECUTE ON FUNCTION public.record_savings_transfer(uuid,numeric,uuid,uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_savings_transfer(uuid,numeric,uuid,uuid,date) TO authenticated;
