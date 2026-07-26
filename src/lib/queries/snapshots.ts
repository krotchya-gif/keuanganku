import { createClient } from '@/utils/supabase/client';
import type { NetWorthSnapshot } from '@/shared';

export async function fetchSnapshots(userId: string, limit = 12): Promise<NetWorthSnapshot[]> {
  const { data } = await createClient()
    .from('net_worth_snapshots').select('*').eq('user_id', userId)
    .order('snapshot_date', { ascending: true }).limit(limit);
  return (data ?? []) as NetWorthSnapshot[];
}
