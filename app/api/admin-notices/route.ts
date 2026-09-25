import {NextRequest,NextResponse} from 'next/server';
import {isCurrentUserAdmin} from '@/lib/queries/admin';
import {backendOrigin,partnerSession,partnerViewer} from '@/lib/partner/server';
import {noticeListSchema,noticeDetailSchema,noticeActionSchema,noticeResultSchema,noticeRecoveredSchema} from '@/lib/partner/billing-notices';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
const fail=(status:number,code:string)=>NextResponse.json({error:{code}},{status,headers});
async function handle(request:NextRequest){
 try{
  if(request.method==='POST'&&request.headers.get('origin')!==request.nextUrl.origin)return fail(403,'INVALID_REQUEST');
  if(!await isCurrentUserAdmin())return fail(403,'ADMIN_REQUIRED');
  const viewer=await partnerViewer(),access=await partnerSession(),origin=backendOrigin();
  if(!viewer||request.headers.get('X-Foreas-Viewer')!==viewer)return fail(409,'IDENTITY_CONFLICT');
  if(!access||!origin)return fail(503,'SERVICE_UNAVAILABLE');
  const params=request.nextUrl.searchParams;let path:string;let body:object|undefined;let schema;
  if(request.method==='GET'){
   if([...params.keys()].some(k=>!['id','cursor'].includes(k))||[...params.keys()].length>1)return fail(400,'INVALID_REQUEST');
   const id=params.get('id'),cursor=params.get('cursor');
   if(id){if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))return fail(400,'INVALID_REQUEST');path='/api/admin/billing-notices/'+id;schema=noticeDetailSchema;}
   else{if(cursor&&cursor.length>500)return fail(400,'INVALID_REQUEST');path='/api/admin/billing-notices'+(cursor?'?cursor='+encodeURIComponent(cursor):'');schema=noticeListSchema;}
  }else{
   if(params.size)return fail(400,'INVALID_REQUEST');const input=await request.json();
   if(input&&Object.keys(input).join(',')==='event_id'&&typeof input.event_id==='string'&&/^evt_[A-Za-z0-9_]{1,200}$/.test(input.event_id)){
    path='/api/admin/billing-notices/recover';body={event_id:input.event_id};schema=noticeRecoveredSchema;
   }else{const parsed=noticeActionSchema.safeParse(input);if(!parsed.success)return fail(400,'INVALID_REQUEST');
    const {id,...action}=parsed.data;path='/api/admin/billing-notices/'+id+'/action';body=action;schema=noticeResultSchema;}
  }
  const response=await fetch(origin+path,{method:request.method,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},
   ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok)return fail(response.status,['NOTICE_REVISION_CONFLICT','NOTICE_REVIEW_REQUIRED','MFA_REQUIRED','AUTH_REQUIRED','ADMIN_REQUIRED'].includes(result?.error?.code)?result.error.code:'SERVICE_UNAVAILABLE');
  const parsed=schema.safeParse(result?.data);
  if(result?.contract_version!=='partner.v1'||!parsed.success)return fail(503,'SERVICE_UNAVAILABLE');
  return NextResponse.json({data:parsed.data,viewer_id:viewer},{headers});
 }catch{return fail(503,'SERVICE_UNAVAILABLE');}
}
export const GET=handle;
export const POST=handle;
