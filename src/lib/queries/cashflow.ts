import { createClient } from '@/utils/supabase/client';
import type { CashflowItem } from '@/shared';

export async function fetchCashflowItems(userId: string): Promise<CashflowItem[]> {
  const { data, error } = await createClient().from('cashflow_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CashflowItem[];
}
