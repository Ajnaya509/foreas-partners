import {NextRequest,NextResponse} from 'next/server';
import {isCurrentUserAdmin} from '@/lib/queries/admin';
import {backendOrigin,partnerSession,partnerViewer} from '@/lib/partner/server';
import {payoutReviewActionSchema,payoutReviewListSchema,payoutReviewResultSchema,payoutReviewResultMatches} from '@/lib/partner/payout-reviews';
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
  let body;const params=request.nextUrl.searchParams;
  if(request.method==='POST'){
   if(params.size)return fail(400,'INVALID_REQUEST');const parsed=payoutReviewActionSchema.safeParse(await request.json());
   if(!parsed.success)return fail(400,'INVALID_REQUEST');body=parsed.data;
  }else if([...params.keys()].some(k=>!['after_created','after_id','candidate_after'].includes(k)||params.getAll(k).length!==1)||params.size>3)return fail(400,'INVALID_REQUEST');
  const response=await fetch(origin+'/api/admin/payout-reviews'+(params.size?'?'+params:''),{method:request.method,
   headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok)return fail(response.status,['OPERATION_CONFLICT','INVALID_REQUEST','MFA_REQUIRED','AUTH_REQUIRED','ADMIN_REQUIRED'].includes(result?.error?.code)?result.error.code:'SERVICE_UNAVAILABLE');
  const parsed=(body?payoutReviewResultSchema:payoutReviewListSchema).safeParse(result?.data);
  if(result?.contract_version!=='partner.v1'||!parsed.success)return fail(503,'SERVICE_UNAVAILABLE');
  if(body&&!payoutReviewResultMatches(body,payoutReviewResultSchema.parse(parsed.data),viewer))return fail(503,'SERVICE_UNAVAILABLE');
  return NextResponse.json({data:parsed.data,viewer_id:viewer},{headers});
 }catch{return fail(503,'SERVICE_UNAVAILABLE');}
}
export const GET=handle;
export const POST=handle;
