import 'server-only';
import {cache} from 'react';
import type {z} from 'zod';
import {backendOrigin,partnerSession} from './server';
import {
  LEGACY_READ_VERSION,legacyMeSchema,legacySummarySchema,legacyCommissionsSchema,
  type LegacyResource,type LegacySnapshot,
} from './legacy-read';

const unavailable=(code:string)=>({status:'unavailable',code}) as const;

async function legacyGet<T>(path:string,schema:z.ZodType<T>):Promise<LegacyResource<T>> {
  const origin=backendOrigin();
  if(!origin)return unavailable('SERVICE_UNAVAILABLE');
  const access=await partnerSession();
  if(!access)return unavailable('AUTH_REQUIRED');
  try {
    const response=await fetch(`${origin}/api/partner-legacy/${path}`,{
      headers:{Authorization:`Bearer ${access}`},cache:'no-store',signal:AbortSignal.timeout(10000),
    });
    const json=await response.json();
    if(json?.contract_version!==LEGACY_READ_VERSION)return unavailable('SERVICE_UNAVAILABLE');
    if(!response.ok)return unavailable(typeof json?.error?.code==='string'?json.error.code:'SERVICE_UNAVAILABLE');
    if(!json?.meta?.as_of||!Number.isFinite(Date.parse(json.meta.as_of)))return unavailable('SERVICE_UNAVAILABLE');
    const parsed=schema.safeParse(json.data);
    return parsed.success?{status:'ready',data:parsed.data,asOf:json.meta.as_of}:unavailable('SERVICE_UNAVAILABLE');
  }catch{return unavailable('SERVICE_UNAVAILABLE');}
}

export const getLegacyMe=cache(()=>legacyGet('me',legacyMeSchema));
export const getLegacySummary=cache(()=>legacyGet('summary',legacySummarySchema));
export const getLegacyCommissions=cache((cursor:string|null)=>{
  if(cursor&&!/^[A-Za-z0-9_-]{1,500}$/.test(cursor))return Promise.resolve(unavailable('INVALID_REQUEST'));
  const query=new URLSearchParams({limit:'25'});
  if(cursor)query.set('cursor',cursor);
  return legacyGet(`commissions?${query}`,legacyCommissionsSchema);
});
export const getLegacySnapshot=cache(async(cursor:string|null=null):Promise<LegacySnapshot>=>{
  const me=await getLegacyMe();
  if(me.status!=='ready')return {me,summary:me,commissions:me};
  if(me.data.admission.state!=='active'&&me.data.admission.state!=='paused'){
    const noAccess=unavailable('PARTNER_NOT_ADMITTED');
    return {me,summary:noAccess,commissions:noAccess};
  }
  const [summary,commissions]=await Promise.all([getLegacySummary(),getLegacyCommissions(cursor)]);
  return {me,summary,commissions};
});
