import { createClient } from '@/utils/supabase/client';

export interface CryptoHolding {
  id: string; user_id: string; account_id: string | null; coin_id: string; symbol: string; name: string;
  quantity: number; current_price_idr: number; last_price_updated_at: string | null;
  created_at: string; updated_at: string;
}

export async function fetchCryptoHoldings(userId: string) {
  const { data, error } = await createClient().from('crypto_holdings').select('*').eq('user_id', userId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as CryptoHolding[];
}

export async function refreshCryptoPrices(holdings: CryptoHolding[]) {
  if (!holdings.length) return holdings;
  const response = await fetch(`/api/crypto/prices?ids=${holdings.map((h) => h.coin_id).join(',')}&symbols=${holdings.map((h) => h.symbol).join(',')}`);
  if (!response.ok) return holdings;
  const prices = await response.json() as Record<string, { idr?: number; last_updated_at?: number }>;
  const supabase = createClient();
  return Promise.all(holdings.map(async (holding) => {
    const quote = prices[holding.coin_id] ?? prices[holding.symbol.toLowerCase()];
    if (!quote?.idr) return holding;
    const updated = { current_price_idr: quote.idr, last_price_updated_at: quote.last_updated_at ? new Date(quote.last_updated_at * 1000).toISOString() : new Date().toISOString() };
    await supabase.from('crypto_holdings').update(updated).eq('id', holding.id).eq('user_id', holding.user_id);
    return { ...holding, ...updated };
  }));
}
