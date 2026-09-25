import Link from 'next/link';
import { GlassCard } from '@/components/foreas/GlassCard';
import { AdminRightsTable } from '@/components/partner/AdminRightsTable';
import { getAdminRights } from '@/lib/partner/admin-program-server';
import { rightsQuerySchema,financeStates,financeLabels } from '@/lib/partner/admin-program';
import { PROMESSE_PARRAINAGE } from '@/lib/parrainagePromesse';

export default async function AdminPayoutsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const raw=await searchParams;
 const parsed=rightsQuerySchema.safeParse(Object.fromEntries(Object.entries(raw).filter(([,value])=>value!==undefined&&value!=='')));
 if(!parsed.success)return <section className="space-y-md"><h1 className="font-display text-h1 text-text-primary">Filtres non reconnus</h1><p className="text-text-secondary">Aucune lecture de droits n’a été faite.</p><Link href="/admin/payouts" className="font-display inline-flex min-h-12 items-center underline">Ouvrir le relevé sans filtre</Link></section>;
 const query=parsed.data,result=await getAdminRights(query);
 const next=new URLSearchParams();for(const [key,value] of Object.entries(query))if(value&&key!=='cursor')next.set(key,value);
 if(result.status==='ready'&&result.data.pagination.next_cursor)next.set('cursor',result.data.pagination.next_cursor);
 return <div className="space-y-xl text-text-secondary">
   <header className="space-y-sm"><h1 className="font-display text-display-l text-text-primary">Commissions et versements</h1><p>{PROMESSE_PARRAINAGE}</p><p>Seul l’apporteur direct est rémunéré. Un essai gratuit ou une facture non admissible ne crée pas une commission payable.</p></header>
   <form method="get" className="flex flex-wrap items-end gap-md"><div><label htmlFor="rights-status" className="block mb-xs">État du droit</label><select id="rights-status" name="status" defaultValue={query.status??''} className="min-h-12 px-md rounded-lg bg-glass-low border border-glass-border text-text-primary"><option value="">Tous les états</option>{financeStates.map(state=><option key={state} value={state}>{financeLabels[state]}</option>)}</select></div>{query.sponsor_id&&<><input type="hidden" name="sponsor_id" value={query.sponsor_id}/><input type="hidden" name="sponsor_type" value={query.sponsor_type}/></>}<button type="submit" className="font-display min-h-12 px-lg rounded-lg border border-glass-border">Filtrer</button><Link href="/admin/payouts" className="font-display inline-flex min-h-12 items-center underline">Effacer les filtres</Link></form>
   {query.sponsor_id&&<p>Relevé limité à {query.sponsor_type==='partner'?'ce partenaire':'ce chauffeur'} : <span className="select-all break-all">{query.sponsor_id}</span>.</p>}
   <GlassCard>{result.status==='ready'?<><AdminRightsTable data={result.data} asOf={result.asOf}/>{result.data.pagination.next_cursor&&<Link href={`/admin/payouts?${next}`} className="font-display mt-lg inline-flex min-h-12 items-center underline">Page suivante</Link>}</>:<div role="alert" className="space-y-md"><h2 className="font-display text-h2 text-text-primary">Relevé indisponible</h2><p>Les droits n’ont pas pu être vérifiés. Aucun total ni versement vide n’est déduit de cette erreur.</p><Link href="/admin/payouts" className="font-display inline-flex min-h-12 items-center underline">Réessayer la lecture</Link></div>}</GlassCard>
 </div>;
}
