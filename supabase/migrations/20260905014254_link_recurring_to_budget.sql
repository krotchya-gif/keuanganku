CREATE OR REPLACE FUNCTION public.sync_recurring_to_budget()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE budget_cat public.budget_category;
BEGIN
  budget_cat := CASE NEW.category
    WHEN 'pendapatan' THEN 'PENDAPATAN'::public.budget_category
    WHEN 'masa_depan_investasi' THEN 'TABUNGAN_INVESTASI'::public.budget_category
    WHEN 'kewajiban_cicilan' THEN 'HUTANG'::public.budget_category
    ELSE 'BIAYA_OPERASIONAL'::public.budget_category END;
  IF NEW.is_active THEN
    UPDATE public.budget_items SET amount = NEW.amount, category = budget_cat, is_active = TRUE, updated_at = now()
      WHERE user_id = NEW.user_id AND name = NEW.name;
    IF NOT FOUND THEN
      INSERT INTO public.budget_items (user_id, name, category, amount, frequency, is_active)
        VALUES (NEW.user_id, NEW.name, budget_cat, NEW.amount, 'bulanan', TRUE);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS sync_recurring_to_budget ON public.recurring_transactions;
CREATE TRIGGER sync_recurring_to_budget AFTER INSERT OR UPDATE OF name, category, amount, is_active
  ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.sync_recurring_to_budget();
REVOKE EXECUTE ON FUNCTION public.sync_recurring_to_budget() FROM PUBLIC, anon, authenticated;
