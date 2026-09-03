import { createClient } from '@/utils/supabase/client';
import type { Asset } from '@/shared';

export async function fetchAssets(userId: string): Promise<Asset[]> {
  const { data, error } = await createClient().from('assets').select('*').eq('user_id', userId).order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as Asset[];
}
