import 'server-only';
import {createHash, createHmac} from 'node:crypto';
import {createClient as createAdmin, type User} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {ENROLLMENT_POLICY, TERMS, PROFILES, type Enrollment, type EnrollmentState} from './policy';

export const termsHash=()=>createHash('sha256').update(TERMS).digest('hex');
export function settings() {
  if(process.env.PARTNER_ENROLLMENT_ENABLED!=='true')throw new Error('PROGRAMME_NOT_OPEN');
  const mode=process.env.PARTNER_ENROLLMENT_MODE;
  if(mode!=='live'&&mode!=='test')throw new Error('PROGRAMME_NOT_OPEN');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'';
  if(mode==='live'&&url!=='https://fihvdvlhftcxhlnocqiq.supabase.co')throw new Error('PROGRAMME_NOT_OPEN');
  if(mode==='test'&&url==='https://fihvdvlhftcxhlnocqiq.supabase.co')throw new Error('PROGRAMME_NOT_OPEN');
  const origin=process.env.PARTNER_ENROLLMENT_ORIGIN||'https://partners.foreas.xyz';
  const u=new URL(origin);
  if(u.origin!==origin||u.username||u.password||u.protocol!=='https:'&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1'].includes(u.hostname)))throw new Error('PROGRAMME_NOT_OPEN');
  return {mode,origin,url};
}
export function adminDb(){
  const {url}=settings();
  const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key)throw new Error('PROGRAMME_NOT_OPEN');
  return createAdmin(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function currentUser(required=true):Promise<User|null>{
  const auth=await createClient();const {data,error}=await auth.auth.getUser();
  if(error||!data.user||data.user.is_anonymous){if(required)throw new Error('AUTH_REQUIRED');return null;}
  if(!data.user.email_confirmed_at)throw new Error('EMAIL_UNCONFIRMED');
  return data.user;
}
export async function rpc(name:string,args:Record<string,unknown>){
  const {data,error}=await adminDb().rpc(name,args);
  if(error){const code=['EXISTING_PARTNER','PROFILE_INVALID','EMAIL_UNCONFIRMED','TERMS_CHANGED','CONDITIONS_REQUIRED','IDENTITY_CONFLICT','CONNECT_UNCERTAIN','STRIPE_APPROVAL_REQUIRED'].find(c=>error.message.includes(c));throw new Error(code||'SERVICE_UNAVAILABLE');}
  return data;
}
export async function limit(identity:string,limit=20,seconds=60){
  const secret=process.env.PARTNER_ENROLLMENT_RATE_SECRET;
  if(!secret||secret.length<32)throw new Error('PROGRAMME_NOT_OPEN');
  const key=createHmac('sha256',secret).update(identity).digest('hex');
  if(!await rpc('partner_enrollment_rate',{p_key:key,p_limit:limit,p_seconds:seconds}))throw new Error('RATE_LIMITED');
}
export async function enrollment(userId:string):Promise<Enrollment|null>{
  const {data,error}=await adminDb().from('partner_enrollments').select('*').eq('user_id',userId).maybeSingle();
  if(error)throw new Error('SERVICE_UNAVAILABLE');
  if(data&&data.mode!==settings().mode)throw new Error('IDENTITY_CONFLICT');
  return data;
}
export async function getState(user:User|null):Promise<EnrollmentState>{
  if(!user)return {signedIn:false};
  const e=await enrollment(user.id);
  if(!e){
    const {data,error}=await adminDb().from('partners').select('id').eq('user_id',user.id).maybeSingle();
    if(error)throw new Error('SERVICE_UNAVAILABLE');
    return {signedIn:true,userId:user.id,email:user.email,legacy:!!data,name:String(user.user_metadata?.full_name||'')};
  }
  const {data:p,error}=await adminDb().from('partners').select('referral_code,status').eq('id',e.partner_id).eq('user_id',user.id).single();
  if(error||!p)throw new Error('SERVICE_UNAVAILABLE');
  const ready=e.status==='ready'&&p.status==='active'&&e.connect_state==='ready';
  const finance=await rpc('partner_enrollment_finance',{p_user:user.id});
  return {signedIn:true,userId:user.id,email:user.email,name:e.name,ready,
    finance,
    enrollment:{partner_id:e.partner_id,name:e.name,profile:e.profile,country:e.country,status:e.status,terms_version:e.terms_version,accepted_at:e.accepted_at,connect_state:e.connect_state,connect_checked_at:e.connect_checked_at,connect_error:e.connect_error},
    code:ready?p.referral_code:null,link:ready&&p.referral_code?`https://www.foreas.xyz/r/${encodeURIComponent(p.referral_code)}`:null};
}
export async function register(user:User,body:Record<string,unknown>){
  const name=typeof body.name==='string'?body.name.trim():'';
  if(name.length<2||name.length>120||!PROFILES.some(([v])=>v===body.profile)||body.country!=='FR')throw new Error('PROFILE_INVALID');
  return rpc('partner_enrollment_register',{p_user:user.id,p_email:user.email,p_name:name,p_profile:body.profile,p_country:'FR',p_mode:settings().mode});
}
function stripeKey(){
  const {mode}=settings();const key=process.env.STRIPE_SECRET_KEY||process.env.STRIPE_SECRET_KEY_LIVE||'';
  if(!key.startsWith(mode==='live'?'sk_live_':'sk_test_')&&!key.startsWith(mode==='live'?'rk_live_':'rk_test_'))throw new Error('CONNECT_UNAVAILABLE');
  return key;
}
export async function stripeRequest(path:string,params?:URLSearchParams,idempotency?:string):Promise<any>{
  const response=await fetch('https://api.stripe.com/v1/'+path,{method:params?'POST':'GET',headers:{Authorization:'Bearer '+stripeKey(),...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(idempotency?{'Idempotency-Key':idempotency}:{})},body:params,cache:'no-store',signal:AbortSignal.timeout(18000)});
  const data=await response.json();
  if(!response.ok){if(data.error?.param==='requested_capabilities'&&/approval/i.test(data.error?.message||''))throw new Error('STRIPE_APPROVAL_REQUIRED');throw new Error('CONNECT_UNAVAILABLE');}
  return data;
}
async function ownedAccount(userId:string,e:Enrollment,account:any){
  if(account.id!==e.stripe_account_id||account.country!==e.country)throw new Error('IDENTITY_CONFLICT');
  if(account.metadata?.partner_enrollment===e.partner_id&&account.metadata?.owner===userId&&account.metadata?.mode===e.mode)return;
  const {data:d,error}=await adminDb().from('drivers').select('id,stripe_account_id').eq('auth_user_id',userId).maybeSingle();
  if(error||!d||d.stripe_account_id!==account.id||account.metadata?.driver_id!==d.id)throw new Error('IDENTITY_CONFLICT');
}
export function connectStatus(account:any):Enrollment['connect_state']{
  const r=account.requirements||{};
  if(r.pending_verification?.length)return 'pending';
  return account.details_submitted===true&&account.capabilities?.transfers==='active'&&account.payouts_enabled===true&&!(r.currently_due?.length||r.past_due?.length||r.errors?.length)?'ready':'incomplete';
}
export async function refreshConnect(user:User){
  const e=await enrollment(user.id);if(!e?.stripe_account_id)return getState(user);
  const account=await stripeRequest('accounts/'+encodeURIComponent(e.stripe_account_id));await ownedAccount(user.id,e,account);
  const state=connectStatus(account);
  await rpc('partner_enrollment_connect_save',{p_user:user.id,p_operation:e.connect_operation,p_account:account.id,p_state:state,p_error:null});
  // Opening a link requires the real site's attribution path to be deployed too.
  // No transfer route exists in this package, regardless of this setting.
  if(state==='ready'&&process.env.PARTNER_ENROLLMENT_REFERRAL_READY==='true')await rpc('partner_enrollment_activate',{p_user:user.id});
  return getState(user);
}
export async function connect(user:User){
  stripeKey();
  let e=await enrollment(user.id);
  if(!e?.accepted_at||e.status==='paused')throw new Error('CONDITIONS_REQUIRED');
  if(!e.stripe_account_id){
    const op=await rpc('partner_enrollment_connect_start',{p_user:user.id}) as Enrollment&{create:boolean};
    if(op.create){
      try{
        // A driver who already receives through Stripe keeps the same account.
        const {data:d,error}=await adminDb().from('drivers').select('id,stripe_account_id').eq('auth_user_id',user.id).maybeSingle();
        if(error)throw new Error('SERVICE_UNAVAILABLE');
        let account:any;
        if(d?.stripe_account_id){account=await stripeRequest('accounts/'+encodeURIComponent(d.stripe_account_id));if(account.metadata?.driver_id!==d.id||account.country!==e.country)throw new Error('IDENTITY_CONFLICT');}
        else account=await stripeRequest('accounts',new URLSearchParams({type:'express',country:e.country,email:user.email||'','capabilities[transfers][requested]':'true','settings[payouts][schedule][interval]':'manual','metadata[partner_enrollment]':e.partner_id,'metadata[owner]':user.id,'metadata[mode]':e.mode,'metadata[operation]':op.connect_operation}),'partner-enrollment/'+op.connect_operation);
        await rpc('partner_enrollment_connect_save',{p_user:user.id,p_operation:op.connect_operation,p_account:account.id,p_state:connectStatus(account),p_error:null});
      }catch(error){
        const code=error instanceof Error&&error.message==='STRIPE_APPROVAL_REQUIRED'?'STRIPE_APPROVAL_REQUIRED':'CONNECT_UNCERTAIN';
        await rpc('partner_enrollment_connect_save',{p_user:user.id,p_operation:op.connect_operation,p_account:null,p_state:'unavailable',p_error:code});
        throw new Error(code);
      }
    }
    e=await enrollment(user.id);
  }
  if(!e?.stripe_account_id)throw new Error('CONNECT_UNCERTAIN');
  const account=await stripeRequest('accounts/'+encodeURIComponent(e.stripe_account_id));await ownedAccount(user.id,e,account);
  const origin=settings().origin;
  const link=await stripeRequest('account_links',new URLSearchParams({account:e.stripe_account_id,type:'account_onboarding',refresh_url:origin+'/inscription?retour=stripe',return_url:origin+'/inscription?retour=stripe'}));
  if(typeof link.url!=='string'||!link.url.startsWith('https://connect.stripe.com/'))throw new Error('CONNECT_UNAVAILABLE');
  return {url:link.url};
}
