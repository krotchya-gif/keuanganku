import { createClient } from '@/utils/supabase/client';
import type { SavingsGoal } from '@/shared';
import type { Account } from '@/shared';

export async function fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await createClient().from('savings_goals').select('*').eq('user_id', userId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as SavingsGoal[];
}

export async function fetchSavingsAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await createClient().from('accounts').select('*').eq('user_id', userId).eq('is_active', true).neq('type', 'crypto').order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Account[];
}

export async function addSavingsTransfer(input: { userId: string; goalId: string; amount: number; sourceAccountId: string; destinationAccountId: string; date: string }) {
  const supabase = createClient();
  const { error } = await supabase.rpc('record_savings_transfer', {
    p_goal_id: input.goalId, p_amount: input.amount,
    p_source_account_id: input.sourceAccountId,
    p_destination_account_id: input.destinationAccountId, p_date: input.date,
  });
  if (error) throw new Error(error.message);
}
