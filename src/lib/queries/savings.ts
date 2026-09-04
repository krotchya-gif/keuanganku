import { createClient } from '@/utils/supabase/client';
import type { SavingsGoal } from '@/shared';
import type { Account } from '@/shared';

export async function fetchSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const { data, error } = await createClient().from('savings_goals').select('*').eq('user_id', userId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as SavingsGoal[];
}

export async function fetchSavingsAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await createClient().from('accounts').select('*').eq('user_id', userId).eq('is_active', true).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Account[];
}

export async function addSavingsTransfer(input: { userId: string; goalId: string; amount: number; sourceAccountId: string; destinationAccountId: string; date: string }) {
  const supabase = createClient();
  const { data: sourceBefore, error: sourceBeforeError } = await supabase.from('accounts').select('balance').eq('id', input.sourceAccountId).eq('user_id', input.userId).single();
  if (sourceBeforeError) throw new Error(sourceBeforeError.message);
  if (Number(sourceBefore.balance) < input.amount) throw new Error('Saldo rekening sumber tidak mencukupi.');
  const { error: txError } = await supabase.from('transactions').insert({
    user_id: input.userId, transaction_date: input.date, amount: input.amount,
    category: 'TABUNGAN_INVESTASI', subcategory: 'Setoran tabungan',
    description: 'Transfer ke target tabungan', transaction_type: 'transfer',
    account_id: input.sourceAccountId, transfer_to_account_id: input.destinationAccountId,
    savings_goal_id: input.goalId,
  });
  if (txError) throw new Error(txError.message);

  const { data: goal, error: goalError } = await supabase.from('savings_goals').select('current_amount').eq('id', input.goalId).eq('user_id', input.userId).single();
  if (goalError) throw new Error(goalError.message);
  const { error } = await supabase.from('savings_goals').update({ current_amount: Number(goal.current_amount || 0) + input.amount }).eq('id', input.goalId).eq('user_id', input.userId);
  if (error) throw new Error(error.message);
}
