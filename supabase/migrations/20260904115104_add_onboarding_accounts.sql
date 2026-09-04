-- Onboarding financial setup and account balances.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER NOT NULL DEFAULT 1
    CHECK (onboarding_step BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS financial_priorities JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Existing users should not be forced through the new flow.
UPDATE public.users SET onboarding_status = 'completed'
WHERE onboarding_status = 'not_started' AND created_at < NOW();

CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'ewallet', 'other')),
  balance DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "accounts_select_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_insert_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_update_own" ON public.accounts;
DROP POLICY IF EXISTS "accounts_delete_own" ON public.accounts;
CREATE POLICY "accounts_select_own" ON public.accounts FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "accounts_insert_own" ON public.accounts FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "accounts_update_own" ON public.accounts FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "accounts_delete_own" ON public.accounts FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.accounts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
