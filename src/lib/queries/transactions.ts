import { createClient } from '@/utils/supabase/client';
import type { Transaction } from '@/shared';

export async function fetchTransactions(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
  const { data } = await createClient()
    .from('transactions').select('*').eq('user_id', userId)
    .gte('transaction_date', startDate).lte('transaction_date', endDate)
    .order('transaction_date', { ascending: false });
  return (data ?? []) as Transaction[];
}

export async function fetchTransactionsByCategory(userId: string, category: string, startDate: string, endDate: string): Promise<Transaction[]> {
  const { data } = await createClient()
    .from('transactions').select('*').eq('user_id', userId).eq('category', category)
    .gte('transaction_date', startDate).lte('transaction_date', endDate);
  return (data ?? []) as Transaction[];
}
