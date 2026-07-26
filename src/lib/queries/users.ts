import { createClient } from '@/utils/supabase/client';

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await createClient().auth.getUser();
  return user?.id ?? null;
}
