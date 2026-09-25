import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GlassCard } from '@/components/foreas/GlassCard';
import { AdminRightsTable } from '@/components/partner/AdminRightsTable';
import { getAdminPartner,getAdminRights } from '@/lib/partner/admin-program-server';
import { partnerUuid,type AdminPartner } from '@/lib/partner/admin-program';
import { DiscountForm } from './DiscountForm';

export default async function AdminPartnerFichePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!partnerUuid.safeParse(id).success)notFound();
 let partner:AdminPartner;
 try{partner=await getAdminPartner(id);}catch{return <section className="space-y-md text-text-secondary"><h1 className="font-display text-h1 text-text-primary">Dossier indisponible</h1><p>L’identité et les réglages du partenaire n’ont pas pu être vérifiés.</p><Link href={`/admin/partners/${id}`} className="font-display inline-flex min-h-12 items-center underline">Réessayer</Link><br/><Link href="/admin/partners" className="font-display inline-flex min-h-12 items-center underline">Retour aux partenaires</Link></section>;}
 const rights=await getAdminRights({sponsor_type:'partner',sponsor_id:id});
 const rightsPath=`/admin/payouts?sponsor_type=partner&sponsor_id=${id}`;
 return <div className="space-y-xl text-text-secondary">
   <Link href="/admin/partners" className="font-display inline-flex min-h-12 items-center underline">Retour aux partenaires</Link>
   <header className="space-y-sm"><h1 className="font-display text-display-l text-text-primary">{partner.company_name}</h1><p>{partner.contact_email}{partner.contact_phone?` · ${partner.contact_phone}`:''}</p>{partner.siret&&<p>SIRET : {partner.siret}</p>}<p>État enregistré : {partner.status==='active'?'actif':partner.status==='paused'?'en pause':'en attente'}.</p><p>Les conditions acceptées et les informations de versement restent à vérifier. Un code enregistré ne suffit pas à confirmer leur disponibilité.</p>{partner.referral_code&&<p>Code enregistré : <span className="select-all">{partner.referral_code}</span></p>}<Link href="/admin/partner-pending" className="font-display inline-flex min-h-12 items-center underline">Examiner les admissions</Link></header>
   <GlassCard><h2 className="font-display text-h1 text-text-primary mb-lg">Remise aux chauffeurs</h2><DiscountForm key={JSON.stringify(partner)} partner={partner}/></GlassCard>
   <GlassCard><h2 className="font-display text-h1 text-text-primary mb-lg">Droits de ce partenaire</h2>{rights.status==='ready'?<AdminRightsTable data={rights.data} asOf={rights.asOf}/>:<p role="alert">Les droits actuels sont indisponibles. Aucun montant de l’ancien registre ne les remplace.</p>}<Link href={rightsPath} className="font-display mt-lg inline-flex min-h-12 items-center underline">Ouvrir le relevé avec ses filtres et ses pages</Link></GlassCard>
 </div>;
}
