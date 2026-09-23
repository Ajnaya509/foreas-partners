'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState} from 'react';
import {ArrowRight,Home,LifeBuoy,Link2,LogOut,Share2,Wallet} from 'lucide-react';
import {ForeasLogo} from '@/components/foreas/ForeasLogo';
import type {LegacySnapshot} from '@/lib/partner/legacy-read';
import type {PartnerSection} from '@/lib/partner/model';
import {LegacyEvidence} from './LegacyEvidence';

const sections=[{id:'accueil',path:'',label:'Accueil',icon:Home},{id:'partager',path:'/partager',label:'Partager',icon:Share2},{id:'gains',path:'/gains',label:'Mes gains',icon:Wallet},{id:'aide',path:'/aide',label:'Aide',icon:LifeBuoy}] as const;
const titles={accueil:'Retrouvez votre dossier partenaire.',partager:'Votre lien doit être vérifié.',gains:'Votre historique, sans estimation.',aide:'Une réponse pour votre dossier.'};
const admissionLabel=(state:string)=>({active:'Partenaire actif',pending:'Dossier en attente',paused:'Partenariat en pause'}[state]??'Statut à vérifier');

export function LegacyPortal({snapshot,section,cursor=null}:{snapshot:LegacySnapshot;section:PartnerSection;cursor?:string|null}){
  const router=useRouter();
  const [loggingOut,setLoggingOut]=useState(false);
  const [logoutError,setLogoutError]=useState(false);
  if(snapshot.me.status!=='ready')return null;
  const me=snapshot.me.data;
  async function logout(){
    setLoggingOut(true);setLogoutError(false);
    try{const {createClient}=await import('@/lib/supabase/client');const result=await createClient().auth.signOut();if(result.error)throw result.error;
      router.replace('/login?role=partner');router.refresh();
    }catch{setLogoutError(true);setLoggingOut(false);}
  }
  return <div className="partner-shell">
    <a className="partner-skip" href="#partner-content">Aller au contenu</a>
    <aside className="partner-sidebar">
      <Link href="/partner" className="partner-brand" aria-label="FOREAS, accueil partenaire"><ForeasLogo variant="full" color="currentColor" height={24}/><span>Espace partenaire</span></Link>
      <nav aria-label="Espace partenaire" className="partner-nav">{sections.map(({id,path,label,icon:Icon})=><Link key={id} href={`/partner${path}`} aria-current={section===id?'page':undefined} className={`partner-nav-link ${section===id?'is-current':''}`}><Icon size={20} aria-hidden/><span>{label}</span></Link>)}</nav>
      <div className="partner-sidebar-footer"><p>{me.organization.name}</p><span>{admissionLabel(me.admission.state)}</span><button className="partner-logout" disabled={loggingOut} onClick={logout}><LogOut size={16}/>{loggingOut?'Déconnexion…':'Se déconnecter'}</button>{logoutError&&<p role="alert">La déconnexion a échoué. Réessayez.</p>}</div>
    </aside>
    <main id="partner-content" className="partner-main" tabIndex={-1}>
      <div className="partner-topline"><span>FOREAS Driver <span aria-hidden> / </span>{sections.find(item=>item.id===section)?.label}</span><span>{admissionLabel(me.admission.state)}</span></div>
      <header className="partner-page-header"><p className="partner-kicker">Compte existant</p><h1>{titles[section]}</h1><p>{section==='gains'?'Les montants ci-dessous proviennent de votre ancien registre. Ils ne sont pas ajoutés au nouveau relevé.':'Ce dossier est relié au compte avec lequel vous êtes connecté.'}</p></header>
      {section==='accueil'&&<>
        <div className="partner-home-grid"><section className="partner-panel"><p className="partner-kicker">Votre dossier</p><h2>{me.organization.name}</h2><p>{admissionLabel(me.admission.state)}</p><p className="partner-caption">Votre compte détermine les informations accessibles. Aucun nouveau droit n’est créé ici.</p></section><section className="partner-panel"><p className="partner-kicker">Votre historique</p><h2>Les montants enregistrés</h2><p>Retrouvez les états exacts de l’ancien registre. Un état marqué payé ne prouve pas une réception sur votre banque.</p><Link className="partner-button" href="/partner/gains">Lire mes gains <ArrowRight size={18}/></Link></section></div>
        <LegacyEvidence snapshot={snapshot} showRows={false}/>
      </>}
      {section==='partager'&&<section className="partner-panel partner-section"><Link2 size={26} aria-hidden/><h2 className="partner-small-title">Aucun lien personnel vérifié à partager.</h2><p>{me.referral?'Un code figure dans votre dossier. Le service ne confirme pas encore une adresse utilisable avec ce code.':'Aucun code partageable n’est confirmé pour ce compte.'}</p><p className="partner-caption">Le prix et tout avantage pour le chauffeur doivent être vérifiés avant votre prochain partage.</p><Link className="partner-button" href="/partner/aide">Demander de l’aide <ArrowRight size={18}/></Link></section>}
      {section==='gains'&&<LegacyEvidence snapshot={snapshot} cursor={cursor}/>}
      {section==='aide'&&<div className="partner-home-grid"><section className="partner-panel"><p className="partner-kicker">Votre compte</p><h2>{me.organization.name}</h2><p>Les conditions et le barème applicables à votre dossier doivent être vérifiés avec FOREAS avant toute nouvelle annonce.</p><p className="partner-caption">L’ancien registre et le nouveau programme restent séparés.</p></section><section className="partner-panel"><p className="partner-kicker">Une question ?</p><h2>Écrivez à FOREAS par e-mail.</h2><p>Indiquez votre sujet et la référence d’une ligne si elle est concernée. N’envoyez ni mot de passe ni renseignement bancaire.</p><a className="partner-button" href="mailto:contact@foreas.xyz?subject=Aide%20partenaire%20FOREAS" aria-label="Envoyer un e-mail à contact@foreas.xyz">Écrire à contact@foreas.xyz <ArrowRight size={18}/></a></section></div>}
      <footer className="partner-footer"><span>FOREAS Driver · Compte partenaire existant</span><Link href="/partner/aide">Aide</Link></footer>
    </main>
  </div>;
}
