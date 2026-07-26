import { createClient } from '@/utils/supabase/client';
import type { SavingsGoal } from '@/shared';

export async function fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const { data } = await createClient().from('savings_goals').select('*').eq('user_id', userId).order('created_at');
  return (data ?? []) as SavingsGoal[];
}
