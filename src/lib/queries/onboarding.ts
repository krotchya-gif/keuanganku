import { createClient } from '@/utils/supabase/client';
import type { Account, AccountType, Asset, AssetCategory, CashflowCategory, Debt, DebtTerm, OnboardingStatus } from '@/shared';

export interface OnboardingProfile {
  status: OnboardingStatus;
  step: number;
  priorities: string[];
}

export async function fetchAccounts(userId: string): Promise<Account[]> {
  const { data, error } = await createClient().from('accounts').select('*').eq('user_id', userId).eq('is_active', true).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Account[];
}

export async function getOnboardingProfile(userId: string): Promise<OnboardingProfile> {
  const { data, error } = await createClient().from('users').select('onboarding_status,onboarding_step,financial_priorities').eq('id', userId).single();
  if (error) throw new Error(error.message);
  return { status: (data.onboarding_status ?? 'completed') as OnboardingStatus, step: data.onboarding_step ?? 1, priorities: data.financial_priorities ?? [] };
}

export async function saveOnboardingProgress(userId: string, step: number, priorities?: string[]) {
  const update: Record<string, unknown> = { onboarding_status: 'in_progress', onboarding_step: step };
  if (priorities) update.financial_priorities = priorities;
  const { error } = await createClient().from('users').update(update).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function finishOnboarding(userId: string, status: 'completed' | 'skipped', priorities: string[]) {
  const { error } = await createClient().from('users').update({ onboarding_status: status, onboarding_step: 6, onboarding_completed_at: status === 'completed' ? new Date().toISOString() : null, financial_priorities: priorities }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function createOnboardingAccount(userId: string, input: { name: string; type: AccountType; balance: number }): Promise<Account> {
  const { data, error } = await createClient().from('accounts').insert({ user_id: userId, ...input }).select().single();
  if (error) throw new Error(error.message);
  return data as Account;
}

export async function createOnboardingAsset(userId: string, input: { name: string; category: AssetCategory; amount: number }): Promise<Asset> {
  const { data, error } = await createClient().from('assets').insert({ user_id: userId, ...input }).select().single();
  if (error) throw new Error(error.message);
  return data as Asset;
}

export async function createOnboardingDebt(userId: string, input: { name: string; term: DebtTerm; total_amount: number; monthly_payment: number }): Promise<Debt> {
  const { data, error } = await createClient().from('debts').insert({ user_id: userId, ...input }).select().single();
  if (error) throw new Error(error.message);
  return data as Debt;
}

export async function createOnboardingCashflow(userId: string, input: { name: string; direction: 'masuk' | 'keluar'; category: CashflowCategory; amount: number }) {
  const { error } = await createClient().from('cashflow_items').insert({ user_id: userId, ...input, is_recurring: true });
  if (error) throw new Error(error.message);
}
