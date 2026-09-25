import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthenticatedActor } from './brain/types';
import { FOUNDER_OWNER_ID, FOUNDER_SUBJECT } from './identity';

export class FounderAccessError extends Error {
  constructor(public readonly code: 'unauthenticated' | 'forbidden' | 'mfa_required' | 'unavailable' | 'configuration') { super(code); }
}
const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
export type FounderIdentity = { subject: string; ownerId: string };
export type FounderProof = { actor: AuthenticatedActor; sessionId: string; expiresAt: number };
const refuse = (code: FounderAccessError['code']): never => { throw new FounderAccessError(code); };
/** Read the successful MFA event, never the refreshed JWT's issue time. */
export function mfaTimestamp(claims: Record<string, unknown>, now: number, maxAgeMs: number): number {
  if (claims.aal !== 'aal2' || !Array.isArray(claims.amr)) return refuse('mfa_required');
  const events = claims.amr.filter((e): e is {method: string; timestamp: number} => !!e && typeof e === 'object'
    && ['mfa/totp', 'mfa/phone'].includes(e.method) && Number.isSafeInteger(e.timestamp) && e.timestamp > 0);
  if (!events.length) return refuse('mfa_required');
  const at = Math.max(...events.map(e => e.timestamp * 1000));
  if (at > now || now - at >= maxAgeMs) return refuse('mfa_required');
  return at;
}
export async function authenticateFounder(client: SupabaseClient, identity: FounderIdentity, maxAgeMs = 300_000, now = Date.now): Promise<FounderProof> {
  if (identity.subject!==FOUNDER_SUBJECT || identity.ownerId!==FOUNDER_OWNER_ID) return refuse('configuration');
  const signal = AbortSignal.timeout(4500);
  const check = () => { if (signal.aborted) refuse('unavailable'); };
  const run = async () => {
    const { data: session, error: sessionError } = await client.auth.getSession(); check();
    const token = session?.session?.access_token;
    if (sessionError || !token) return refuse('unauthenticated');
    const { data: userData, error: userError } = await client.auth.getUser(token); check();
    const user = userData?.user;
    if (userError || !user?.id) return refuse('unauthenticated');
    const { data: signed, error: signedError } = await client.auth.getClaims(token); check();
    const claims = signed?.claims;
    if (signedError || !claims || claims.sub !== user.id || !Number.isFinite(claims.exp)
      || claims.exp * 1000 <= now() || typeof claims.session_id !== 'string' || !uuid.test(claims.session_id)) return refuse('unauthenticated');
    if (user.id !== identity.subject) return refuse('forbidden');
    const {data: role, error: roleError} = await client.from('user_roles').select('user_id,role,is_active,revoked_at')
      .eq('user_id', user.id).in('role',['admin','super_admin']).eq('is_active',true).is('revoked_at',null).abortSignal(signal).maybeSingle(); check();
    if (roleError) return refuse('unavailable');
    if (!role || role.user_id !== user.id || !['admin','super_admin'].includes(role.role) || role.is_active !== true || role.revoked_at !== null) return refuse('forbidden');
    // Auth may continue accepting an unexpired JWT after sign-out. Read its actual
    // session row through an own-session-only function; no browser assertion suffices.
    const {data: current, error: currentError} = await client.rpc('founder_session_is_current', {expected_session_id: claims.session_id}).abortSignal(signal); check();
    if (currentError) return refuse('unavailable');
    if (current !== true) return refuse('unauthenticated');
    const at = mfaTimestamp(claims as Record<string, unknown>, now(), maxAgeMs);
    return {actor: {ownerId:identity.ownerId, channel:'admin' as const, subject:user.id, assurance:'mfa' as const,
      authenticatedAt:new Date(at).toISOString()}, sessionId:claims.session_id, expiresAt:Math.min(at+maxAgeMs,claims.exp*1000)};
  };
  try {
    return await Promise.race([run(), new Promise<never>((_,reject)=>signal.addEventListener('abort',()=>reject(new FounderAccessError('unavailable')),{once:true}))]);
  } catch(e) { if(e instanceof FounderAccessError) throw e; return refuse('unavailable'); }
}
