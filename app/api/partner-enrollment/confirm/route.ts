import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {settings} from '@/lib/partner-enrollment/server';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){
  const headers={'Cache-Control':'private, no-store'};
  try{
    const {origin}=settings();if(request.headers.get('origin')!==origin||request.nextUrl.origin!==origin)throw new Error();
    if(!request.headers.get('content-type')?.includes('application/json'))throw new Error();
    const raw=await request.text();if(Buffer.byteLength(raw)>2048)throw new Error();
    const body=JSON.parse(raw);
    if(Object.keys(body).sort().join(',')!=='hash,type'||typeof body.hash!=='string'||!/^[a-f0-9]{32,128}$/i.test(body.hash)||!['signup','magiclink'].includes(body.type))throw new Error();
    const auth=await createClient();const {data,error}=await auth.auth.verifyOtp({token_hash:body.hash,type:body.type});
    if(error||!data.user||!data.session)throw new Error();
    return NextResponse.json({confirmed:true},{headers});
  }catch{return NextResponse.json({error:'Ce lien a expiré ou a déjà été utilisé. Demande un nouveau lien pour reprendre ton inscription.'},{status:400,headers});}
}
