import { createClient } from '@/utils/supabase/client';
import type { Asset } from '@/shared';

export async function fetchAssets(userId: string): Promise<Asset[]> {
  const { data } = await createClient().from('assets').select('*').eq('user_id', userId).order('created_at');
  return (data ?? []) as Asset[];
}
