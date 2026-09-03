import { createClient } from '@/utils/supabase/client';
import type { SavingsGoal } from '@/shared';

export async function fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await createClient().from('savings_goals').select('*').eq('user_id', userId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as SavingsGoal[];
}
