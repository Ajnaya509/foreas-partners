"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import type {PartnerTermsDocument} from '@/lib/partner/contract';
import {safeWebUrl,meSchema} from '@/lib/partner/model';
import {useRequestGuard} from './useRequestGuard';
const headers=(viewerId:string|null|undefined)=>({'Content-Type':'application/json','X-Foreas-Viewer':viewerId??''});
export function TermsAcceptance({document,viewerId}:{document:PartnerTermsDocument;viewerId?:string|null}){
  const guard=useRequestGuard();const router=useRouter();const [checked,setChecked]=useState(false);const [state,setState]=useState<'idle'|'loading'|'error'|'changed'>('idle');
  const secondMonthRule=document.version==='2026-09-24.1';
  async function accept(){
    if(!checked||state==='loading')return;const isCurrent=guard();setState('loading');
    try{
      const res=await fetch('/api/partner-data/action',{method:'POST',headers:headers(viewerId),body:JSON.stringify({action:'accept_terms',version:document.version,sha256:document.sha256})});
      const body=await res.json();if(!isCurrent())return;
      if(!res.ok){setState(body?.error?.code==='TERMS_CHANGED'?'changed':'error');return;}
      if(body?.data?.version!==document.version||!body?.data?.accepted_at||body?.viewer_id!==viewerId)throw new Error();
      router.replace('/partner#preparer-versements');router.refresh();setState('idle');setChecked(false);
    }catch{if(isCurrent())setState('error');}
  }
  return <div className="mt-lg">
    <p className="partner-caption">Avant de commencer, voici l’essentiel de la version {document.version}.</p>
    <ul className="mt-md space-y-sm text-body leading-relaxed">
      <li>Ta recommandation peut te rémunérer si l’abonnement du chauffeur est payé et admissible. Aucun revenu n’est garanti.</li>
      <li>{secondMonthRule?'10 € par mensualité admissible et 50 € au premier annuel. Pour le mensuel, le premier versement attend le paiement confirmé du deuxième mois du même abonnement.':'Pour le mensuel, le versement suit les mensualités payées et admissibles, selon le document en vigueur.'}</li>
      <li>Tu peux arrêter de partager à tout moment et demander ton retrait à contact@foreas.xyz. Les droits déjà acquis restent traités selon les conditions.</li>
    </ul>
    <a href={document.document_url} target="_blank" rel="noopener noreferrer" className="partner-button">Lire les conditions complètes</a>
    <label className="mt-lg flex gap-md items-start text-body leading-relaxed"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} disabled={state==='loading'} className="mt-xs min-h-6 min-w-6"/><span>J’ai lu les conditions du programme partenaire, version {document.version}, et je les accepte pour mon activité.</span></label>
    <button className="partner-button is-primary" disabled={!checked||state==='loading'} onClick={accept}>{state==='loading'?'Enregistrement…':'Accepter et continuer'}</button>
    {state==='error'&&<p role="alert" className="partner-caption">L’acceptation n’a pas été confirmée. Réessaie.</p>}
    {state==='changed'&&<p role="alert" className="partner-caption">Les conditions ont changé. Actualise la page et lis la nouvelle version.</p>}
  </div>;
}
export function PayoutAccountAction({viewerId}:{viewerId?:string|null}){
  const guard=useRequestGuard();const [state,setState]=useState<'idle'|'loading'|'error'>('idle');
  async function open(){
    const isCurrent=guard();setState('loading');
    try{
      const res=await fetch('/api/partner-data/action',{method:'POST',headers:headers(viewerId),body:JSON.stringify({action:'payout_link'})});
      const body=await res.json();if(!isCurrent())return;
      const url=safeWebUrl(body?.data?.url);if(!res.ok||!url||body?.viewer_id!==viewerId)throw new Error();
      const host=new URL(url).hostname;if(!['connect.stripe.com','dashboard.stripe.com'].includes(host))throw new Error();
      window.location.assign(url);
    }catch{if(isCurrent())setState('error');}
  }
  return <div><button className="partner-button" onClick={open} disabled={state==='loading'}>{state==='loading'?'Ouverture…':'Compléter les informations de versement'}</button><p className="partner-caption">Cette action ouvre l’espace sécurisé de paiement. Elle ne déclenche aucun versement.</p>{state==='error'&&<p role="alert">L’espace de paiement n’a pas pu être ouvert. Réessayez.</p>}</div>;
}
export function ActivateAccount({viewerId}:{viewerId?:string|null}){
  const guard=useRequestGuard();const router=useRouter();const [state,setState]=useState<'idle'|'loading'|'error'|'conflict'>('idle');
  async function activate(){
    const isCurrent=guard();setState('loading');
    try{
      const res=await fetch('/api/partner-data/action',{method:'POST',headers:headers(viewerId),body:JSON.stringify({action:'activate'})});
      const body=await res.json();if(!isCurrent())return;
      if(!res.ok){setState(body?.error?.code==='IDENTITY_CONFLICT'?'conflict':'error');return;}
      if(body?.contract_version!=='partner.v1'||!meSchema.safeParse(body.data).success||body?.viewer_id!==viewerId)throw new Error();
      router.refresh();setState('idle');
    }catch{if(isCurrent())setState('error');}
  }
  return <div className="partner-panel mt-lg"><h2 className="partner-small-title">Vous avez déjà une admission préparée ?</h2><p>Reliez-la au compte avec lequel vous êtes connecté. Cette action n’envoie aucun courriel.</p><button onClick={activate} disabled={state==='loading'} className="partner-button">{state==='loading'?'Vérification…':'Relier mon compte partenaire'}</button>{state==='conflict'&&<p role="alert">Aucune admission unique n’a pu être reliée à ce compte. Contactez FOREAS pour vérifier votre candidature.</p>}{state==='error'&&<p role="alert">Le rattachement n’a pas été confirmé. Réessayez après avoir actualisé votre dossier.</p>}</div>;
}
