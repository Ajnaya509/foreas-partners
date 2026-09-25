import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { z } from 'zod';
import { meSchema, summarySchema, commissionsSchema, termsSchema, kitSchema, type Resource, type PartnerSnapshot } from './model';

const unavailable = (code:string) => ({status:'unavailable',code}) as const;
const partnerContext = cache(async ():Promise<{access:string;viewerId:string}|null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const auth=await createClient();
  const {data:{user},error}=await auth.auth.getUser();
  if(error || !user) return null;
  const {data:{session}}=await auth.auth.getSession();
  return session?.access_token && session.user.id===user.id ? {access:session.access_token,viewerId:user.id} : null;
});
export const partnerSession=cache(async()=> (await partnerContext())?.access??null);
export const partnerViewer=cache(async()=> (await partnerContext())?.viewerId??null);
export function backendOrigin():string|null {
  const value=process.env.PARTNER_BACKEND_URL || process.env.BACKEND_URL;
  if(!value) return null;
  try {const u=new URL(value); if(u.username || u.password || u.search || u.hash || u.pathname!=='/') return null;
    if(u.protocol==='https:' || (process.env.NODE_ENV!=='production' && u.protocol==='http:' && ['localhost','127.0.0.1'].includes(u.hostname))) return u.origin;
  }catch{} return null;
}
export async function partnerGet<T>(path:string,schema:z.ZodType<T>):Promise<Resource<T>> {
  const origin=backendOrigin();
  if(!origin) return unavailable('SERVICE_UNAVAILABLE');
  const accessToken=await partnerSession();
  if(!accessToken) return unavailable('AUTH_REQUIRED');
  try {
    const response=await fetch(`${origin}${path}`,{headers:{Authorization:`Bearer ${accessToken}`},cache:'no-store',signal:AbortSignal.timeout(10000)});
    const json=await response.json();
    if(!response.ok) return unavailable(json?.error?.code ?? 'SERVICE_UNAVAILABLE');
    if(json?.contract_version!=='partner.v1' || !json?.meta?.as_of || !Number.isFinite(new Date(json.meta.as_of).getTime())) return unavailable('SERVICE_UNAVAILABLE');
    const parsed=schema.safeParse(json.data);
    return parsed.success ? {status:'ready',data:parsed.data,asOf:json.meta.as_of} : unavailable('SERVICE_UNAVAILABLE');
  }catch {return unavailable('SERVICE_UNAVAILABLE');}
}
export const getPartnerMe=cache(()=>partnerGet('/api/partner/me',meSchema));
export const getPartnerKit=cache(()=>partnerGet('/api/partner/kit',kitSchema));
export const getPartnerTerms=cache(()=>partnerGet('/api/partner/terms',termsSchema));
export const getPartnerSnapshot=cache(async ():Promise<PartnerSnapshot>=>{
  const me=await getPartnerMe();
  const viewerId=await partnerViewer();
  if(me.status!=='ready') return {me,summary:me,commissions:me,terms:me,kit:me,demo:false,viewerId};
  const noAccess=unavailable('PARTNER_NOT_ADMITTED');
  const [summary,commissions,terms,kit]=await Promise.all([
    me.data.capabilities.can_read_commissions ? partnerGet('/api/partner/summary',summarySchema):noAccess,
    me.data.capabilities.can_read_commissions ? partnerGet('/api/partner/commissions?limit=25',commissionsSchema):noAccess,
    getPartnerTerms(),getPartnerKit(),
  ]);
  return {me,summary,commissions,terms,kit,demo:false,viewerId};
});
