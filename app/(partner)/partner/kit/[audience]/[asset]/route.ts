import {NextRequest,NextResponse} from 'next/server';
import {getPartnerMe,getPartnerKit,getPartnerTerms} from '@/lib/partner/server';
import {previewEnabled,referralForSharing,fixedRatePolicyVerified} from '@/lib/partner/model';
import {getAudience,kitAssets,kitId,KIT_VERSION,kitDocument,messagePack} from '@/lib/partner/kit';
import {kitBrand} from '@/lib/partner/kit-brand';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{audience:string;asset:string}>}){
  const {audience,asset}=await params;const a=getAudience(audience);const resource=kitAssets.find(r=>r.asset===asset);
  if(!a||!resource)return new NextResponse('Support introuvable',{status:404});
  const preview=request.nextUrl.searchParams.get('preview')==='1';
  if([...request.nextUrl.searchParams.keys()].some(k=>k!=='preview')||request.nextUrl.searchParams.getAll('preview').length>1||(request.nextUrl.searchParams.has('preview')&&!preview))return new NextResponse('Demande invalide',{status:400});
  if(preview&&!previewEnabled())return new NextResponse('Support introuvable',{status:404});
  let referral:string|null=null;
  let fixedRates=false;
  if(!preview){
    const [me,kit,terms]=await Promise.all([getPartnerMe(),getPartnerKit(),getPartnerTerms()]);
    if(me.status!=='ready')return new NextResponse('Connexion partenaire requise',{status:me.code==='AUTH_REQUIRED'?401:403});
    if(kit.status!=='ready'||kit.data.availability!=='available'||!kit.data.items.some(i=>i.id===kitId(audience,asset)&&i.version===KIT_VERSION&&new URL(i.url).pathname===request.nextUrl.pathname))return new NextResponse('Ce support n’est pas publié',{status:404});
    referral=referralForSharing(me.data);
    fixedRates=terms.status==='ready'&&fixedRatePolicyVerified(me.data,terms.data);
    if(resource.personalized&&!referral)return new NextResponse('Votre lien personnel doit être validé avant ce téléchargement',{status:409});
  }
  if(asset==='messages.txt'&&!referral&&!preview)return new NextResponse('Aucun message personnalisé sans lien validé',{status:409});
  const body=asset==='messages.txt'?(preview?'APERÇU LOCAL — TRAMES SANS LIEN. Ne pas envoyer avant validation du compte et insertion du lien personnel.\n\n':'')+messagePack(a.id,referral??'[Lien personnel à ajouter après validation]',preview||fixedRates):kitDocument(a.id,asset,referral,preview,await kitBrand(),fixedRates);
  return new NextResponse(body,{headers:{'Content-Type':asset.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8','Content-Disposition':`attachment; filename="foreas-${audience}-${asset}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
}
