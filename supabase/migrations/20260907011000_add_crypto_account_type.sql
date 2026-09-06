ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_type_check
  CHECK (type IN ('cash', 'bank', 'ewallet', 'crypto', 'other'));

-- Existing accounts already used as crypto wallets become crypto accounts,
-- so they are no longer classified as cash in Net Worth.
UPDATE public.accounts a
SET type = 'crypto'
WHERE a.type = 'other'
  AND EXISTS (
    SELECT 1 FROM public.crypto_holdings h WHERE h.account_id = a.id
  );
