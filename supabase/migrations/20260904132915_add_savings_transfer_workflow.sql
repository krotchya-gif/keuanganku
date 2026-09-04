ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense'
    CHECK (transaction_type IN ('income', 'expense', 'transfer')),
  ADD COLUMN IF NOT EXISTS transfer_to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS savings_goal_id UUID REFERENCES public.savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to_account ON public.transactions(transfer_to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_savings_goal ON public.transactions(savings_goal_id);
