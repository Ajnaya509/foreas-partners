import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { DriverReferralContext } from './referral';

const profileSchema = z.object({
  id: z.string().uuid(), auth_user_id: z.string().uuid(),
  first_name: z.string().nullable(), last_name: z.string().nullable(),
  referral_code: z.string().nullable(), referral_code_new: z.string().nullable(),
});
/** No money, legacy counters, generated code, or write occurs in this read. */
export const getDriverReferralContext = cache(async (): Promise<DriverReferralContext> => {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { status: 'unavailable', code: 'AUTH_REQUIRED' };
    const row = await supabase.from('drivers')
      .select('id,auth_user_id,first_name,last_name,referral_code,referral_code_new')
      .eq('auth_user_id', user.id).maybeSingle();
    const parsed = profileSchema.safeParse(row.data);
    if (row.error || !parsed.success || parsed.data.auth_user_id !== user.id)
      return { status: 'unavailable', code: 'PROFILE_UNAVAILABLE' };
    return { status: 'ready', viewerId: user.id, profile: parsed.data };
  } catch {
    return { status: 'unavailable', code: 'PROFILE_UNAVAILABLE' };
  }
});
