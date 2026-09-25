import {notFound} from 'next/navigation';
import {Portal} from '@/components/partner/Portal';
import {previewEnabled,previewSnapshot,type PartnerSection} from '@/lib/partner/model';
export const dynamic='force-dynamic';
export const metadata={title:'Aperçu local — FOREAS partenaires',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{section?:string[]}>;searchParams:Promise<{etat?:string}>}){
  if(!previewEnabled())notFound();
  const p=await params;const q=await searchParams;const section=p.section?.[0]??'accueil';
  if((p.section?.length??0)>1||!['accueil','partager','gains','aide'].includes(section))notFound();
  return <Portal snapshot={previewSnapshot(q.etat==='erreur')} section={section as PartnerSection} previewError={q.etat==='erreur'}/>;
}
