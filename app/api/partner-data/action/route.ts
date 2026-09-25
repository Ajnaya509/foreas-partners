import {NextRequest,NextResponse} from 'next/server';
import {backendOrigin,partnerSession,partnerViewer} from '@/lib/partner/server';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin||origin!==request.nextUrl.origin)return NextResponse.json({error:{code:'INVALID_REQUEST'}},{status:403});
  const base=backendOrigin();const access=await partnerSession();
  if(!base||!access)return NextResponse.json({error:{code:access?'SERVICE_UNAVAILABLE':'AUTH_REQUIRED'}},{status:access?503:401});
  const viewerId=await partnerViewer();
  if(!viewerId||request.headers.get('X-Foreas-Viewer')!==viewerId)return NextResponse.json({error:{code:'IDENTITY_CONFLICT'}},{status:409,headers:{'Cache-Control':'private, no-store'}});
  let body;try{body=await request.json();}catch{return NextResponse.json({error:{code:'INVALID_REQUEST'}},{status:400});}
  const keys=Object.keys(body??{}).sort().join(',');let path:string;let payload:object;
  if(body?.action==='accept_terms'&&keys==='action,sha256,version'&&typeof body.version==='string'&&body.version.length<=200&&/^[a-f0-9]{64}$/i.test(body.sha256)){path='/api/partner/terms/accept';payload={version:body.version,sha256:body.sha256};}
  else if(body?.action==='activate'&&keys==='action'){path='/api/partner/activate';payload={};}
  else if(body?.action==='payout_link'&&keys==='action'){path='/api/partner/payout-account/link';payload={};}
  else return NextResponse.json({error:{code:'INVALID_REQUEST'}},{status:400});
  try{
    const response=await fetch(base+path,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store',signal:AbortSignal.timeout(15000)});
    const json=await response.json();
    if(json?.contract_version!=='partner.v1')throw new Error('Unexpected contract');
    return NextResponse.json({...json,viewer_id:viewerId},{status:response.status,headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
