"use client";
import {FinanceEvidence,CommissionEvidenceNote,reservationLabels} from './FinanceEvidence';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,useEffect,type ReactNode} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Check,ChevronDown,Copy,Download,Home,LifeBuoy,Link2,LogOut,Share2,Wallet} from 'lucide-react';
import {ForeasLogo} from '@/components/foreas/ForeasLogo';
import {TermsAcceptance,PayoutAccountAction,ActivateAccount} from './AccountActions';
import {useRequestGuard} from './useRequestGuard';
import {partnerCopy as c,fixedRateAnswers} from '@/lib/partner/copy';
import {audiences,kitAssets,kitId,KIT_VERSION,personalMessage,type AudienceId} from '@/lib/partner/kit';
import {formatMoney,formatDate,referralForSharing,safeWebUrl,commissionsSchema,audienceForCategory,fixedRatePolicyVerified,type PartnerSnapshot,type PartnerSection} from '@/lib/partner/model';
import type {PartnerCommission} from '@/lib/partner/contract';
import type {LegacySnapshot} from '@/lib/partner/legacy-read';
import {LegacyEvidence} from './LegacyEvidence';

const sections=[{id:'accueil',path:'',icon:Home},{id:'partager',path:'/partager',icon:Share2},{id:'gains',path:'/gains',icon:Wallet},{id:'aide',path:'/aide',icon:LifeBuoy}] as const;
const button='partner-button';
function Panel({children,className=''}:{children:ReactNode;className?:string}){return <section className={`partner-panel ${className}`}>{children}</section>;}
function Notice({code,retry=true}:{code:string;retry?:boolean}){
  const router=useRouter();const error=c.errors[code as keyof typeof c.errors]??c.errors.SERVICE_UNAVAILABLE;
  return <div className="partner-notice" role="status"><h2 className="partner-small-title">{error.title}</h2><p>{error.text}</p>{code==='AUTH_REQUIRED'?<Link className={button} href="/login?role=partner&next=%2Fpartner">Se connecter <ArrowRight size={18}/></Link>:retry&&code!=='PREVIEW_NO_ACCOUNT'&&<button className={button} onClick={()=>router.refresh()}>{c.refresh}</button>}</div>;
}
function SaveText({text,name,label,disabled=false}:{text:string;name:string;label:string;disabled?:boolean}){
  function save(){const u=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  return <button className={button} disabled={disabled} onClick={save}><Download size={18}/>{label}</button>;
}
function ClipboardButton({text,link=false}:{text:string;link?:boolean}){
  const [status,setStatus]=useState<'idle'|'working'|'done'|'error'>('idle');
  useEffect(()=>{setStatus('idle');},[text]);
  async function copy(){setStatus('working');try{await navigator.clipboard.writeText(text);setStatus('done');}catch{setStatus('error');}}
  return <div><button className={button} disabled={status==='working'} onClick={copy}>{status==='done'?<Check size={18}/>:<Copy size={18}/>} {status==='done'?(link?c.linkCopied:c.copied):link?c.copyLink:c.copy}</button><span className="sr-only" role="status">{status==='done'?(link?c.linkCopied:c.copied):''}</span>{status==='error'&&<p className="partner-caption" role="alert">{c.copyFailed}</p>}</div>;
}
function Policy({fixedRates,demo=false}:{fixedRates:boolean;demo?:boolean}){return fixedRates?<div className="partner-policy">{demo&&<p className="partner-caption md:col-span-2">Montants d’exemple pour cet aperçu. Vos conditions et la date de paiement restent à confirmer.</p>}<div><p className="partner-kicker">Mensuel admissible</p><p className="partner-money">5 <span>€ / mois</span></p></div><div><p className="partner-kicker">Premier annuel admissible</p><p className="partner-money">50 <span>€ une fois</span></p></div>{!demo&&<p className="partner-caption md:col-span-2">{c.policyNote}</p>}</div>:<p className="partner-caption">{c.policy}</p>;}
type PortalProps={snapshot:PartnerSnapshot;section:PartnerSection;previewError?:boolean;legacy?:LegacySnapshot|null;legacyCursor?:string|null};
export function Portal(props:PortalProps){
  // New verified snapshot means a new private view, including all pending actions.
  return <PortalSession key={JSON.stringify([props.section,props.snapshot,props.legacy,props.legacyCursor])} {...props}/>;
}
function PortalSession({snapshot,section,previewError=false,legacy=null,legacyCursor=null}:PortalProps){
  const router=useRouter();
  const requestGuard=useRequestGuard();
  const root=snapshot.demo?'/apercu-partenaire':'/partner';
  const me=snapshot.me.status==='ready'?snapshot.me.data:null;
  const fixedRates=snapshot.demo || fixedRatePolicyVerified(me,snapshot.terms.status==='ready'?snapshot.terms.data:null);
  const referral=referralForSharing(me);
  const [audience,setAudience]=useState<AudienceId|null>(()=>snapshot.demo?'centre':audienceForCategory(me?.organization.type));
  const [lines,setLines]=useState<PartnerCommission[]>(snapshot.commissions.status==='ready'?snapshot.commissions.data.items:[]);
  const [cursor,setCursor]=useState<string|null>(snapshot.commissions.status==='ready'?snapshot.commissions.data.pagination.next_cursor:null);
  const [moreState,setMoreState]=useState<'idle'|'loading'|'error'>('idle');
  const [logoutError,setLogoutError]=useState(false);const [loggingOut,setLoggingOut]=useState(false);
  const selected=audiences.find(a=>a.id===audience);
  const personal=referral&&audience?personalMessage(audience,referral,fixedRates):null;
  async function loadMore(){
    if(!cursor||moreState==='loading'||snapshot.commissions.status!=='ready')return;
    const isCurrent=requestGuard();setMoreState('loading');
    try{
      const r=await fetch(`/api/partner-data/commissions?cursor=${encodeURIComponent(cursor)}`,{cache:'no-store'});
      if(!r.ok)throw new Error();const j=await r.json();
      const parsed=commissionsSchema.safeParse(j.data);if(!parsed.success)throw new Error();
      if(!isCurrent())return;
      if(snapshot.viewerId&&j.viewer_id!==snapshot.viewerId)throw new Error();
      setLines(old=>[...old,...parsed.data.items.filter(i=>!old.some(o=>o.id===i.id))]);
      setCursor(parsed.data.pagination.next_cursor);setMoreState('idle');
    }catch{if(isCurrent())setMoreState('error');}
  }
  async function logout(){
    const isCurrent=requestGuard();setLoggingOut(true);setLogoutError(false);
    try{const {createClient}=await import('@/lib/supabase/client');if(!isCurrent())return;
      const result=await createClient().auth.signOut();if(!isCurrent())return;if(result.error)throw result.error;
      router.replace('/login?role=partner');router.refresh();
    }catch{if(isCurrent()){setLogoutError(true);setLoggingOut(false);}}
  }
  const csv=['Référence;Date;Type;Montant EUR;Statut;Réservation;Vérification nécessaire;Transfert confirmé',...lines.map(l=>`${l.id};${formatDate(l.invoice_paid_at||l.created_at)};${l.kind==='monthly_paid'?'Mensuel':'Premier annuel'};${(l.amount_cents/100).toFixed(2).replace('.',',')};${c.commissionStates[l.status]};${l.reservation_state?reservationLabels[l.reservation_state]:''};${l.batch_review_required||l.right_review_required?'Oui':'Non'};${l.paid_at??''}`)].join('\n');
  const terms=snapshot.terms.status==='ready'?snapshot.terms.data.document:null;
  const publishedAll=snapshot.kit.status==='ready'&&snapshot.kit.data.availability==='available'?snapshot.kit.data.items.filter(item=>{
    const url=safeWebUrl(item.url);
    return !!url&&!new URL(url).pathname.startsWith('/partner/ressources/');
  }):[];
  const published=audience?publishedAll.filter(item=>!item.id.startsWith('foreas-driver-')||item.id.includes(`-${audience}-`)):[];
  return <div className="partner-shell">
    <a className="partner-skip" href="#partner-content">{c.skip}</a>
    <aside className="partner-sidebar">
      <Link href={root} className="partner-brand" aria-label="FOREAS, accueil partenaire"><ForeasLogo variant="full" color="currentColor" height={24}/><span>{c.brand}</span></Link>
      <nav aria-label="Espace partenaire" className="partner-nav">{sections.map(({id,path,icon:Icon})=><Link key={id} href={`${root}${path}`} aria-current={section===id?'page':undefined} className={`partner-nav-link ${section===id?'is-current':''}`}><Icon size={20} aria-hidden/><span>{c.nav[id]}</span></Link>)}</nav>
      <div className="partner-sidebar-footer"><p>{me?.organization.name??'Votre espace FOREAS'}</p><span>{me?c.admissionStates[me.admission.state]:snapshot.demo?'Aperçu du portail':'Espace personnel'}</span>{!snapshot.demo&&me&&<button className="partner-logout" disabled={loggingOut} onClick={logout}><LogOut size={16}/>{loggingOut?'Déconnexion…':'Se déconnecter'}</button>}{logoutError&&<p role="alert">La déconnexion a échoué. Réessayez.</p>}</div>
    </aside>
    <main id="partner-content" className="partner-main" tabIndex={-1}>
      <div className="partner-topline"><span>FOREAS Driver <span aria-hidden> / </span>{c.nav[section]}</span>{snapshot.demo?<span className="partner-preview-label">{c.localPreview}</span>:<span>{me?c.admissionStates[me.admission.state]:'Accès personnel'}</span>}</div>
      <header className="partner-page-header"><p className="partner-kicker">{c.nav[section]}</p><h1>{c.titles[section]}</h1><p>{c.intros[section]}</p></header>
      {!snapshot.demo&&snapshot.me.status!=='ready'&&<Notice code={snapshot.me.code}/>}
      {!snapshot.demo&&snapshot.me.status==='unavailable'&&snapshot.me.code==='PARTNER_NOT_FOUND'&&<ActivateAccount viewerId={snapshot.viewerId}/>}
      {snapshot.demo&&previewError&&<Notice code="SERVICE_UNAVAILABLE"/>}
      {me?.terms.acceptance_required&&<div className="partner-notice"><h2 className="partner-small-title">Les conditions doivent être confirmées.</h2><p>Consultez le document du programme dans Aide avant votre premier partage.</p><Link href={`${root}/aide`} className={button}>Lire les conditions <ArrowRight size={18}/></Link></div>}
      {section==='accueil'&&<>
        <div className="partner-home-grid"><Panel className="partner-start"><div className="partner-step-icon"><Share2 size={24}/></div><p className="partner-kicker">Votre première action</p><h2>Choisissez un support.<br/>Gardez le partage simple.</h2><p>Une fiche, un message ou un guide adapté à votre activité. Vous choisissez le bon moment pour le présenter.</p><Link className={`${button} is-primary`} href={`${root}/partager`}>Choisir mon support <ArrowRight size={18}/></Link></Panel><Panel><p className="partner-kicker">{snapshot.demo?'Exemple de rémunération':'La règle de rémunération'}</p><h2 className="partner-small-title">Une recommandation directe.</h2><Policy fixedRates={fixedRates} demo={snapshot.demo}/><Link href={`${root}/aide`} className="partner-text-link">Comprendre les conditions <ArrowUpRight size={17}/></Link></Panel></div>
        <section className="partner-section"><div className="partner-section-heading"><h2>Votre activité</h2><Link href={`${root}/gains`} className="partner-text-link">Voir mes gains <ArrowRight size={17}/></Link></div>{snapshot.summary.status==='ready'?<div className="partner-summary-grid"><Panel><p>Commissions transférées</p><p className="partner-stat">{formatMoney(snapshot.summary.data.totals_cents.paid)}</p><p className="partner-caption">Transferts confirmés dans le registre actuel.</p></Panel><Panel><p>Commissions admissibles</p><p className="partner-stat">{formatMoney(snapshot.summary.data.totals_cents.eligible)}</p><p className="partner-caption">Ces droits ne sont pas encore transférés.</p></Panel></div>:<Panel><div className="partner-empty"><Wallet size={26}/><div><h3>{snapshot.demo?'Vos premiers résultats, ici.':'Votre activité n’est pas disponible.'}</h3><p>{snapshot.demo?'Aucune donnée réelle n’est utilisée dans cet aperçu.':c.errors.SERVICE_UNAVAILABLE.text}</p></div></div></Panel>}<p className="partner-caption mt-lg">{c.coverage}</p>{snapshot.summary.status==='ready'&&<FinanceEvidence summary={snapshot.summary.data}/>}{snapshot.summary.status==='ready'&&<p className="partner-caption">État du relevé au {formatDate(snapshot.summary.data.observed_at)}.</p>}</section>
        <section className="partner-section"><div className="partner-section-heading"><h2>Trois repères pour commencer</h2></div><ol className="partner-steps">{[['Montrez une fonction réelle','Une démonstration claire suffit pour commencer.'],['Annoncez votre commission','Votre recommandation peut vous rémunérer. Dites-le.'],['Laissez le chauffeur décider','Aucune promesse de revenu. Aucun partage après un refus.']].map(([t,d],i)=><li key={t}><span>{i+1}</span><div><h3>{t}</h3><p>{d}</p></div></li>)}</ol></section>
      </>}
      {section==='accueil'&&legacy&&<LegacyEvidence snapshot={legacy} showRows={false}/>}
      {section==='partager'&&<>
        <Panel><div className="partner-section-heading"><div><p className="partner-kicker">Votre activité</p><h2>Des supports pour votre situation.</h2><p className="partner-caption mt-sm">Ce choix adapte le conseil, le guide et le début du message. Les trois formats de support restent les mêmes. Votre lien et vos conditions ne changent pas.</p></div></div><div className="partner-audiences" role="group" aria-label="Choisir votre situation">{audiences.map(a=><button key={a.id} aria-pressed={audience===a.id} onClick={()=>setAudience(a.id)} className={`${button} ${audience===a.id?'is-selected':''}`}>{a.label}</button>)}</div><div className="partner-audience-note"><BookOpen size={22}/><div><div className="partner-kicker">{selected?`Situation choisie : ${selected.label}`:"Votre situation"}</div><h3>{selected?.moment??"Choisissez votre situation"}</h3><p>{selected?.action??"Choisissez la situation qui ressemble à votre façon de recommander FOREAS Driver."}</p></div></div></Panel>
        <section className="partner-section"><div className="partner-section-heading"><h2>Votre lien de recommandation</h2></div><Panel>{referral?<><p className="partner-link-value">{referral}</p><ClipboardButton text={referral} link/></>:<div className="partner-empty"><Link2 size={26}/><p>{c.noLink}</p></div>}</Panel></section>
        <section className="partner-section"><div className="partner-section-heading"><h2>Votre kit</h2><span className="partner-caption">{!audience?'Profil à choisir':snapshot.demo?'Supports préparés · aperçu local':snapshot.kit.status==='unavailable'?'Disponibilité à vérifier':`${published.length} support${published.length>1?'s':''} publié${published.length>1?'s':''}`}</span></div>
          {!audience?<Panel><p>Choisissez votre activité ci-dessus pour voir les supports adaptés.</p></Panel>:snapshot.demo?<div className="partner-kit-grid">{kitAssets.map(asset=><Panel key={asset.asset}><span className="partner-file-label">{asset.format}</span><h3>{asset.title}</h3><p>{asset.description}</p>{!asset.personalized?<a className={button} href={`/partner/kit/${audience}/${asset.asset}?preview=1`} download><Download size={18}/>Télécharger le guide</a>:<p className="partner-caption">La version avec votre lien sera disponible après validation du compte.</p>}{asset.asset==='messages.txt'&&<a className={button} href={`/partner/kit/${audience}/${asset.asset}?preview=1`} download><Download size={18}/>Voir les trames sans lien</a>}{asset.asset==='fiche-chauffeur.html'&&<a className={button} href={`/partner/kit/${audience}/${asset.asset}?preview=1`} download><Download size={18}/>Voir la fiche sans lien</a>}</Panel>)}</div>:snapshot.kit.status==='unavailable'?<Notice code={snapshot.kit.code}/>:published.length?<div className="partner-kit-grid">{published.map(item=>{const url=safeWebUrl(item.url);return <Panel key={item.id}><span className="partner-file-label">{item.format}</span><h3>{item.title}</h3><p>{item.description}</p>{url?<a href={url} className={button} download><Download size={18}/>Télécharger</a>:<p>Le lien de ce support doit être vérifié.</p>}<p className="partner-caption">Version {item.version} · {formatDate(item.published_at)}</p></Panel>;})}</div>:<Panel><h3>Aucun support publié pour ce profil.</h3><p>Les supports seront proposés ici après leur validation. Les règles et les réponses restent disponibles dans Aide.</p><Link href={`${root}/aide`} className={button}>Consulter l’aide <ArrowRight size={18}/></Link></Panel>}
        </section>
        <section className="partner-section"><div className="partner-section-heading"><h2>Votre message</h2></div><Panel>{personal&&audience&&published.some(i=>i.id===kitId(audience,'messages.txt')&&i.version===KIT_VERSION)?<><label className="partner-kicker" htmlFor="partner-message">À adapter à votre relation réelle</label><textarea id="partner-message" readOnly value={personal} rows={9}/><ClipboardButton text={personal}/></>:<><h3>Un message vrai, avec le bon lien.</h3><p>Le message à copier sera disponible avec votre lien personnel et la version publiée du support. Vous n’avez rien à reconstituer.</p></>}<p className="partner-caption mt-lg">Signalez toujours que le lien peut vous rémunérer. Un témoignage personnel exige une expérience réelle.</p></Panel></section>
      </>}
      {section==='gains'&&<>
        <Panel><Policy fixedRates={fixedRates} demo={snapshot.demo}/></Panel><p className="partner-caption mt-lg">{c.coverage}</p>{snapshot.summary.status==='ready'&&<p className="partner-caption">État du relevé au {formatDate(snapshot.summary.data.observed_at)}.</p>}
        {snapshot.summary.status==='ready'?<section className="partner-section"><div className="partner-summary-grid">{(['paid','eligible','pending_review','reserved'] as const).map(s=><Panel key={s}><p>{c.commissionStates[s]}</p><p className="partner-stat">{formatMoney(snapshot.summary.status==='ready'?snapshot.summary.data.totals_cents[s]:0)}</p></Panel>)}</div><details className="partner-faq mt-lg"><summary>Autres états du registre<ChevronDown size={18}/></summary><dl className="space-y-md py-lg">{(['blocked','reversed','policy_unmapped'] as const).map(state=><div key={state} className="flex flex-wrap justify-between gap-md"><dt>{c.commissionStates[state]}</dt><dd className="tabular-nums">{formatMoney(snapshot.summary.status==='ready'?snapshot.summary.data.totals_cents[state]:0)}</dd></div>)}</dl></details><FinanceEvidence summary={snapshot.summary.data}/><Panel className="mt-lg"><h2 className="partner-small-title">{c.accountStates[snapshot.summary.data.payout_account.state]}</h2><p>{snapshot.summary.data.next_payout_at?`Prochain départ annoncé : ${formatDate(snapshot.summary.data.next_payout_at)}.`:'Aucune date de prochain versement n’est annoncée.'}</p><p className="partner-caption">État vérifié le {formatDate(snapshot.summary.data.payout_account.checked_at)}.</p>{!snapshot.demo&&me?.capabilities.can_manage_payout&&!me.terms.acceptance_required&&snapshot.summary.data.payout_account.state!=='ready'&&snapshot.summary.data.payout_account.state!=='unavailable'&&<PayoutAccountAction viewerId={snapshot.viewerId}/>}<Link className="partner-text-link" href={`${root}/aide`}>Informations et conditions de versement <ArrowRight size={17}/></Link></Panel></section>:<section className="partner-section"><Notice code={snapshot.summary.code} retry={!snapshot.demo}/></section>}
        <section className="partner-section"><p className="partner-caption">Chaque page reflète sa lecture au moment du chargement. Actualisez pour revoir les changements récents.</p><div className="partner-section-heading"><h2>Les commissions enregistrées</h2>{lines.length>0&&<SaveText text={'\ufeff'+csv} name="foreas-commissions-affichees.csv" label="Exporter les lignes affichées"/>}</div>{lines.length?<div className="partner-ledger">{lines.map(l=><article key={l.id}><div><h3>{l.kind==='monthly_paid'?'Abonnement mensuel':'Premier abonnement annuel'}</h3><p>{formatDate(l.invoice_paid_at||l.created_at)}</p><p className="partner-caption break-all">Référence : {l.id}</p></div><span className={`partner-status ${l.status==='paid'?'is-paid':''}`}>{c.commissionStates[l.status]}</span><strong>{formatMoney(l.amount_cents)}</strong>{l.paid_at&&<p className="partner-caption">Transfert confirmé le {formatDate(l.paid_at)}</p>}<CommissionEvidenceNote item={l}/></article>)}</div>:<Panel><div className="partner-empty"><Wallet size={26}/><div><h3>{snapshot.commissions.status==='ready'?'Aucune commission enregistrée.':'Votre historique n’est pas disponible.'}</h3><p>{snapshot.commissions.status==='ready'?'Un partage seul ne crée pas de commission. Les droits apparaissent après un paiement admissible.':'Aucun montant n’est remplacé par une estimation.'}</p></div></div></Panel>}{cursor&&<button className={`${button} mt-lg`} disabled={moreState==='loading'} onClick={loadMore}>{moreState==='loading'?'Chargement…':'Voir les lignes suivantes'}<ChevronDown size={18}/></button>}{moreState==='error'&&<p role="alert">Les lignes suivantes n’ont pas été chargées. Réessayez.</p>}</section>
        {legacy&&<LegacyEvidence snapshot={legacy} cursor={legacyCursor}/>}
      </>}
      {section==='aide'&&<>
        <div className="partner-home-grid"><Panel><p className="partner-kicker">Votre dossier</p><h2>{me?.organization.name??'Votre compte partenaire'}</h2><p>{me?c.admissionStates[me.admission.state]:'Les informations du compte apparaissent après une connexion vérifiée.'}</p><p className="partner-caption">Cet espace concerne la recommandation d’abonnements FOREAS Driver. L’apport de courses est un autre programme.</p></Panel><Panel><p className="partner-kicker">Les conditions du programme</p><h2>{terms?'Consultez votre document.':snapshot.terms.status==='unavailable'&&!snapshot.demo?'Le document est indisponible.':'Le document sera proposé ici.'}</h2>{terms&&safeWebUrl(terms.document_url)?<><a href={terms.document_url} className={button} target="_blank" rel="noopener noreferrer">Lire les conditions <ArrowUpRight size={18}/></a><p>Version {terms.version} · {formatDate(terms.published_at)}</p><p className="partner-caption">{me?.terms.accepted_version===terms.version?'Cette version est enregistrée comme acceptée.':'Cette version doit encore être acceptée.'}</p>{!snapshot.demo&&me?.terms.acceptance_required&&<TermsAcceptance key={terms.version+terms.sha256} document={terms} viewerId={snapshot.viewerId}/>}</>:snapshot.terms.status==='unavailable'&&!snapshot.demo?<Notice code={snapshot.terms.code}/>:<p>Les conditions ne sont pas encore publiées pour ce compte. Aucune acceptation n’est supposée.</p>}{snapshot.demo&&<><a href="/apercu-partenaire/conditions" target="_blank" rel="noopener noreferrer" className={button}>Lire le texte préparé <ArrowUpRight size={18}/></a><p className="partner-caption">Version préparatoire à examiner. Aucune acceptation possible dans l’aperçu.</p></>}</Panel></div>
        <section className="partner-section"><div className="partner-section-heading"><h2>Les réponses utiles</h2></div><div className="partner-faq">{c.faq.map(f=><details key={f.q}><summary>{f.q}<ChevronDown size={18}/></summary><p>{fixedRates?fixedRateAnswers[f.q]??f.a:f.a}</p></details>)}</div></section>
        <Panel className="partner-section"><h2>Une question ? Écrivez à FOREAS par e-mail.</h2><p>Notez la question, la date et la référence visible dans votre espace. Ne transmettez ni mot de passe, ni coordonnées bancaires dans un message.</p><a className={button} href="mailto:contact@foreas.xyz?subject=Aide%20partenaire%20FOREAS" aria-label="Envoyer un e-mail à contact@foreas.xyz">Écrire à contact@foreas.xyz <ArrowUpRight size={18}/></a><SaveText text="Demande d’aide partenaire FOREAS\n\nOrganisation :\nSujet :\nDate du problème :\nCe que j’attendais :\nCe qui s’est passé :\nRéférence de commission si nécessaire :\n\nNe joignez aucun mot de passe ni renseignement bancaire.\n" name="demande-aide-foreas.txt" label="Télécharger le modèle d’aide"/><p className="partner-caption">Envoyez votre demande à contact@foreas.xyz. Joignez seulement les informations nécessaires.</p></Panel>
      </>}
      <footer className="partner-footer"><span>FOREAS Driver · Programme de recommandation</span>{!snapshot.demo&&me&&<button className="partner-logout lg:hidden" disabled={loggingOut} onClick={logout}>Se déconnecter</button>}<Link href={`${root}/aide`}>Règles et aide</Link></footer>
    </main>
  </div>;
}
