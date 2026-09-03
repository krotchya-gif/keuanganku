import { createClient } from '@/utils/supabase/client';
import type { NetWorthSnapshot } from '@/shared';

export async function fetchSnapshots(userId: string, limit = 12, year?: number): Promise<NetWorthSnapshot[]> {
  let query = createClient()
    .from('net_worth_snapshots').select('*').eq('user_id', userId);

  if (year) {
    query = query.gte('snapshot_date', `${year}-01-01`).lte('snapshot_date', `${year}-12-31`);
  }

  // Ambil snapshot TERBARU sebanyak `limit` (descending di DB, lalu dibalik
  // menjadi ascending agar siap dipakai grafik kiri→kanan).
  const { data } = await query
    .order('snapshot_date', { ascending: false })
    .limit(limit);
  return ((data ?? []) as NetWorthSnapshot[]).reverse();
}
