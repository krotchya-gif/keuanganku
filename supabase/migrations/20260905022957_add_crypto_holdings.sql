CREATE TABLE IF NOT EXISTS public.crypto_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL, coin_id TEXT NOT NULL, symbol TEXT NOT NULL, name TEXT NOT NULL,
  quantity NUMERIC(30,12) NOT NULL CHECK (quantity >= 0), current_price_idr NUMERIC(30,2) NOT NULL DEFAULT 0 CHECK (current_price_idr >= 0),
  last_price_updated_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, coin_id, account_id)
);
CREATE INDEX IF NOT EXISTS idx_crypto_holdings_user ON public.crypto_holdings(user_id);
ALTER TABLE public.crypto_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY crypto_holdings_select_own ON public.crypto_holdings FOR SELECT TO authenticated USING ((select auth.uid())=user_id);
CREATE POLICY crypto_holdings_insert_own ON public.crypto_holdings FOR INSERT TO authenticated WITH CHECK ((select auth.uid())=user_id);
CREATE POLICY crypto_holdings_update_own ON public.crypto_holdings FOR UPDATE TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id);
CREATE POLICY crypto_holdings_delete_own ON public.crypto_holdings FOR DELETE TO authenticated USING ((select auth.uid())=user_id);
DROP TRIGGER IF EXISTS set_updated_at ON public.crypto_holdings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crypto_holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
