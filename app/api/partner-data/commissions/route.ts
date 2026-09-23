import {NextRequest,NextResponse} from 'next/server';
import {partnerGet,partnerViewer} from '@/lib/partner/server';
import {commissionsSchema} from '@/lib/partner/model';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const params=request.nextUrl.searchParams;
  if([...params.keys()].some(k=>k!=='cursor')||params.getAll('cursor').length!==1||!params.get('cursor')||params.get('cursor')!.length>2000) return NextResponse.json({error:{code:'INVALID_REQUEST'}},{status:400});
  const response=await partnerGet(`/api/partner/commissions?limit=25&cursor=${encodeURIComponent(params.get('cursor')!)}`,commissionsSchema);
  return NextResponse.json(response.status==='ready'?{data:response.data,as_of:response.asOf,viewer_id:await partnerViewer()}:{error:{code:response.code}},{status:response.status==='ready'?200:response.code==='AUTH_REQUIRED'?401:503,headers:{'Cache-Control':'private, no-store'}});
}
