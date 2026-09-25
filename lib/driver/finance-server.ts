import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { backendOrigin } from '@/lib/partner/server';
import { parseDriverFinance, type DriverFinance } from './finance';

/** Read the same driver ledger as the app, using a fresh verified session. */
export async function getDriverFinance(viewerId:string,driverId:string):Promise<DriverFinance|null> {
 try {
  const origin=backendOrigin();if(!origin)return null;
  const client=await createClient();
  const verified=await client.auth.getUser();
  if(verified.error||verified.data.user?.id!==viewerId)return null;
  const {data:{session},error}=await client.auth.getSession();
  if(error||!session?.access_token||session.user.id!==viewerId)return null;
  const response=await fetch(origin+'/api/referral/finance',{
   headers:{Authorization:'Bearer '+session.access_token},cache:'no-store',signal:AbortSignal.timeout(10000),
  });
  if(!response.ok)return null;
  const value=parseDriverFinance(await response.json(),viewerId);
  return value?.sponsor.id===driverId?value:null;
 }catch{return null;}
}
