import Link from 'next/link';
import { GlassCard } from '@/components/foreas/GlassCard';
import { getAdminPartners } from '@/lib/partner/admin-program-server';
import { getPendingApplications } from '@/lib/queries/partner-applications';
import { ApproveActions } from './ApproveActions';
import { ApplicationActions } from './ApplicationActions';

export default async function AdminPartnerPendingPage(){
 const [partnerResult,applicationResult]=await Promise.allSettled([getAdminPartners(),getPendingApplications()]);
 const pending=partnerResult.status==='fulfilled'?partnerResult.value.filter(p=>p.status==='pending'):null;
 const applications=applicationResult.status==='fulfilled'?applicationResult.value:null;
 return <div className="space-y-xl text-text-secondary">
  <header className="space-y-md"><h1 className="font-display text-display-l text-text-primary">Candidatures partenaires</h1><p>Examinez la demande avant de préparer l’admission. Le résultat du service précise ce qui est confirmé et ce qui reste à faire.</p><p>Une admission préparée ne confirme ni l’accès actif, ni les conditions, ni le compte de versement. Une invitation ne part que si elle est demandée explicitement.</p><Link href="/admin/partners" className="font-display inline-flex min-h-12 items-center underline">Consulter les dossiers partenaires</Link></header>
  <section className="space-y-lg"><h2 className="font-display text-h1 text-text-primary">Demandes reçues du site</h2>
   {applications===null?<GlassCard><div role="alert"><p>Les candidatures du site sont indisponibles. Aucune liste vide n’est déduite de cette erreur.</p><Link href="/admin/partner-pending" className="font-display inline-flex min-h-12 items-center underline">Réessayer la lecture</Link></div></GlassCard>:<><p>{applications.length} demande{applications.length>1?'s':''} reçue{applications.length>1?'s':''} dans cette réponse. Le service ne fournit pas de preuve que cette liste est exhaustive.</p>{applications.length===0?<p>Aucune demande renvoyée par cette lecture.</p>:<div className="grid gap-lg lg:grid-cols-2">{applications.map(a=><GlassCard key={a.id}><h3 className="font-display text-h2 text-text-primary">{a.company_name}</h3><p>{a.contact_name}</p><p>{a.email}</p>{a.phone&&<p>{a.phone}</p>}{a.siret&&<p>SIRET : {a.siret}</p>}<p className="break-all">Référence : {a.id}</p>{a.message&&<blockquote className="my-md border-l border-glass-border pl-md whitespace-pre-wrap">{a.message}</blockquote>}<ApplicationActions applicationId={a.id} companyName={a.company_name}/></GlassCard>)}</div>}</>}
  </section>
  <section className="space-y-lg"><h2 className="font-display text-h1 text-text-primary">Dossiers partenaires en attente</h2><p>Ces dossiers existent déjà. Le service vérifie l’identité avant toute activation. Les conditions et le compte de versement restent distincts.</p>
   {pending===null?<GlassCard><div role="alert"><p>Les dossiers partenaires sont indisponibles. Les demandes du site, si elles sont lisibles, restent affichées séparément.</p><Link href="/admin/partner-pending" className="font-display inline-flex min-h-12 items-center underline">Réessayer la lecture</Link></div></GlassCard>:<><p>{pending.length} dossier{pending.length>1?'s':''} en attente reçu{pending.length>1?'s':''} dans cette réponse, sans déduire un total global.</p>{pending.length===0?<p>Aucun dossier en attente renvoyé par cette lecture.</p>:<div className="grid gap-lg lg:grid-cols-2">{pending.map(p=><GlassCard key={p.id}><h3 className="font-display text-h2 text-text-primary">{p.company_name}</h3><p>{p.contact_email}</p><p className="break-all">Référence : {p.id}</p><Link href={`/admin/partners/${p.id}`} className="font-display inline-flex min-h-12 items-center underline">Lire le dossier</Link><ApproveActions partnerId={p.id} companyName={p.company_name}/></GlassCard>)}</div>}</>}
  </section>
 </div>;
}
