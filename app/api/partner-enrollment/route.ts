import {after,NextRequest,NextResponse} from 'next/server';
import {settings,currentUser,getState,limit,register,rpc,termsHash,connect,refreshConnect} from '@/lib/partner-enrollment/server';
import {sendSignIn,deliverEnrollmentMail,mailSettings} from '@/lib/partner-enrollment/mail';
import {ENROLLMENT_POLICY,enrollmentError} from '@/lib/partner-enrollment/policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function fail(e:unknown){const code=e instanceof Error?e.message:'SERVICE_UNAVAILABLE';const status=code==='AUTH_REQUIRED'?401:code==='RATE_LIMITED'?429:['PROGRAMME_NOT_OPEN','SERVICE_UNAVAILABLE','MAIL_UNAVAILABLE','CONNECT_UNAVAILABLE'].includes(code)?503:409;return NextResponse.json({error:enrollmentError(code),code},{status,headers});}
function mailLater(userId:string){after(async()=>{try{await deliverEnrollmentMail(userId);}catch{console.error('[partner-enrollment] Mail waiting for retry');}});}
export async function GET(){try{settings();return NextResponse.json(await getState(await currentUser(false)),{headers});}catch(e){return fail(e);}}
export async function POST(request:NextRequest){
  try{
    const {origin}=settings();
    if(request.headers.get('origin')!==origin||request.nextUrl.origin!==origin)throw new Error('INVALID_REQUEST');
    if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('INVALID_REQUEST');
    const raw=await request.text();if(Buffer.byteLength(raw)>4096)throw new Error('INVALID_REQUEST');
    const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')throw new Error('INVALID_REQUEST');
    if(body.action==='email'){
      if(Object.keys(body).sort().join(',')!=='action,email'||typeof body.email!=='string')throw new Error('INVALID_REQUEST');
      const email=body.email.trim().toLowerCase();if(email.length>254||!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email))throw new Error('INVALID_REQUEST');
      const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
      await limit('signup-ip:'+ip,6,3600);await limit('signup-mail:'+email,1,180);
      await sendSignIn(email);return NextResponse.json({sent:true},{headers});
    }
    const user=await currentUser();if(!user)throw new Error('AUTH_REQUIRED');
    if(body.userId!==user.id)throw new Error('IDENTITY_CONFLICT');
    await limit('user:'+user.id);
    const keys=Object.keys(body).sort().join(',');
    if(body.action==='register'&&keys==='action,country,name,profile,userId'){
      mailSettings();await register(user,body);mailLater(user.id);return NextResponse.json(await getState(user),{headers});
    }
    if(body.action==='accept'&&keys==='accepted,action,hash,userId,version'){
      if(body.accepted!==true||body.version!==ENROLLMENT_POLICY||body.hash!==termsHash())throw new Error('TERMS_CHANGED');
      await rpc('partner_enrollment_accept',{p_user:user.id,p_version:ENROLLMENT_POLICY,p_hash:termsHash()});
      return NextResponse.json(await getState(user),{headers});
    }
    if(keys!=='action,userId')throw new Error('INVALID_REQUEST');
    if(body.action==='connect')return NextResponse.json(await connect(user),{headers});
    if(body.action==='refresh'){const state=await refreshConnect(user);mailLater(user.id);return NextResponse.json(state,{headers});}
    throw new Error('INVALID_REQUEST');
  }catch(e){return fail(e);}
}
