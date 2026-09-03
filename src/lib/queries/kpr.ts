import { createClient } from '@/utils/supabase/client';

export interface SavedSimulation {
  id: string;
  name: string;
  property_price: number;
  down_payment: number;
  loan_principal: number;
  loan_period_years: number;
  fixed_rate: number;
  fixed_period_years: number;
  floating_rate: number;
  floating_period_years: number | null;
  remaining_principal_at_floating: number | null;
  start_date: string | null;
  monthly_income: number | null;
  npoptkp: number;
  ppn_discount: number;
  ajb_rate: number;
  bbn_rate: number;
  notary_fee: number;
  bank_fee_1: number;
  bank_fee_2: number;
  bank_fee_3: number;
  floating_phases: string | null;
  monthly_installment_min: number;
  monthly_installment_max: number;
  total_interest: number;
  created_at: string;
}

export async function fetchKPRSimulations(userId: string): Promise<SavedSimulation[]> {
  const { data, error } = await createClient().from('kpr_simulations').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SavedSimulation[];
}
