import { createClient } from '@/utils/supabase/client';
import type { BudgetItem } from '@/shared';

export async function fetchBudgetItems(userId: string): Promise<BudgetItem[]> {
  const { data } = await createClient().from('budget_items').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  return (data ?? []) as BudgetItem[];
}

export async function fetchBudgetItemsByCategory(userId: string, category: string): Promise<BudgetItem[]> {
  const { data } = await createClient().from('budget_items').select('*').eq('user_id', userId).eq('category', category);
  return (data ?? []) as BudgetItem[];
}
