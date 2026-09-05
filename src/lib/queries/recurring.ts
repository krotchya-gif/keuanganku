import { createClient } from '@/utils/supabase/client';
import type { CashflowCategory, CashflowDirection } from '@/shared';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  direction: CashflowDirection;
  category: CashflowCategory;
  amount: number;
  frequency: 'monthly' | 'yearly';
  day_of_month: number;
  next_run_date: string;
  last_generated_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchRecurringTransactions(userId: string) {
  const { data, error } = await createClient().from('recurring_transactions').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, is_recurring: true })) as (RecurringTransaction & { is_recurring: true })[];
}
