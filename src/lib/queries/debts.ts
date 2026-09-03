import { createClient } from '@/utils/supabase/client';
import type { Debt } from '@/shared';

export async function fetchDebts(userId: string): Promise<Debt[]> {
  const { data, error } = await createClient().from('debts').select('*').eq('user_id', userId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Debt[];
}
