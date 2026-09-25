import {NextRequest,NextResponse} from 'next/server';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {getPartnerMe,getPartnerKit} from '@/lib/partner/server';
import {previewEnabled} from '@/lib/partner/model';
import {activationAccess,activationFilename,type ActivationResource} from '@/lib/partner/activation-access';
import manifest from '@/lib/partner/activation-manifest.json';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"};
function fail(message:string,status:number){return new NextResponse(message,{status,headers});}
export async function GET(request:NextRequest,{params}:{params:Promise<{filename:string}>}){
  const {filename}=await params;
  const resource=(manifest.items as ActivationResource[]).find(item=>item.filename===filename);
  if(!activationFilename(filename)||!resource)return fail('Support introuvable',404);
  const values=request.nextUrl.searchParams;
  const preview=values.get('preview')==='1';
  if([...values.keys()].some(k=>k!=='preview')||values.getAll('preview').length>1||(values.has('preview')&&!preview))return fail('Demande invalide',400);
  if(preview&&!previewEnabled())return fail('Support introuvable',404);
  try{
    if(!preview){
      const [me,kit]=await Promise.all([getPartnerMe(),getPartnerKit()]);
      if(me.status!=='ready')return fail('Connexion partenaire à vérifier',me.code==='AUTH_REQUIRED'?401:me.code==='SERVICE_UNAVAILABLE'?503:403);
      if(kit.status!=='ready')return fail('Disponibilité des supports à vérifier',503);
      if(!activationAccess(resource,me.data,kit.data))return fail('Ce support n’est pas disponible pour votre compte',404);
    }
    const body=await readFile(join(process.cwd(),'content/partner/activation',resource.filename));
    if(body.byteLength!==resource.bytes||createHash('sha256').update(body).digest('hex')!==resource.sha256)return fail('La version de ce support doit être vérifiée',503);
    return new NextResponse(new Uint8Array(body),{headers:{...headers,'Content-Type':resource.format==='pdf'?'application/pdf':'application/zip','Content-Disposition':`attachment; filename="${resource.filename}"`,'Content-Length':String(body.byteLength)}});
  }catch{return fail('Le téléchargement est momentanément indisponible',503);}
}
