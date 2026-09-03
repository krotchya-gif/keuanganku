import { createClient } from '@/utils/supabase/client';
import type { BudgetItem } from '@/shared';

export async function fetchBudgetItems(userId: string): Promise<BudgetItem[]> {
  const { data, error } = await createClient().from('budget_items').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetItem[];
}

export async function fetchBudgetItemsByCategory(userId: string, category: string): Promise<BudgetItem[]> {
  const { data, error } = await createClient().from('budget_items').select('*').eq('user_id', userId).eq('category', category);
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetItem[];
}
