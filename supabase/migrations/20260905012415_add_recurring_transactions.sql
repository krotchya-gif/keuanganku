CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  direction public.cashflow_direction NOT NULL,
  category public.cashflow_category_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly','yearly')),
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  next_run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_generated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_active
  ON public.recurring_transactions(user_id, is_active, next_run_date);

ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recurring_transactions_select_own ON public.recurring_transactions;
DROP POLICY IF EXISTS recurring_transactions_insert_own ON public.recurring_transactions;
DROP POLICY IF EXISTS recurring_transactions_update_own ON public.recurring_transactions;
DROP POLICY IF EXISTS recurring_transactions_delete_own ON public.recurring_transactions;
CREATE POLICY recurring_transactions_select_own ON public.recurring_transactions FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY recurring_transactions_insert_own ON public.recurring_transactions FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY recurring_transactions_update_own ON public.recurring_transactions FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY recurring_transactions_delete_own ON public.recurring_transactions FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.recurring_transactions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
