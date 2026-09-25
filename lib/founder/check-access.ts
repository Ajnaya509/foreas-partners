'use server';
import { createClient } from '@/lib/supabase/server';
import { founderConfiguration } from './config';
import { authenticateFounder, FounderAccessError } from './access';
async function check(expected:string,sensitive:boolean){
  const config=founderConfiguration();
  if(expected!==config.identity.subject)return {status:'unauthenticated' as const,userId:null};
  try{const p=await authenticateFounder(await createClient(),config.identity,sensitive?120000:300000);return {status:'allowed' as const,userId:p.actor.subject};}
  catch(e){const code=e instanceof FounderAccessError?e.code:'unavailable';return {status:code==='configuration'?'unavailable' as const:code,userId:code==='mfa_required'?config.identity.subject:null};}
}
export async function checkFounderAccess(expected:string){return check(expected,false);}
export async function checkFounderApprovalAccess(expected:string){return check(expected,true);}
