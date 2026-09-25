'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {EnrollmentFrame} from './EnrollmentFrame';
export function ConfirmEmail({hash,type}:{hash:string;type:string}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();
  useEffect(()=>{window.history.replaceState(null,'','/inscription/confirmation');},[]);
  async function confirm(){setBusy(true);setError('');try{const r=await fetch('/api/partner-enrollment/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hash,type})});const data=await r.json();if(!r.ok)throw new Error(data.error);router.replace('/inscription?email=confirme');router.refresh();}catch(e){setError(e instanceof Error?e.message:'La connexion n’a pas abouti. Réessaie.');setBusy(false);}}
  return <EnrollmentFrame><section className="enrollment-card"><p className="enrollment-kicker">Ton compte FOREAS</p><h1>Une dernière confirmation.</h1><p>Continue pour vérifier ton adresse et reprendre ton inscription partenaire.</p>{hash&&['signup','magiclink'].includes(type)?<button className="enrollment-primary" disabled={busy} onClick={confirm}>{busy?'Connexion en cours…':'Confirmer mon adresse'}</button>:<p role="alert">Ce lien est incomplet. Ouvre le dernier email reçu.</p>}{error&&<p className="enrollment-error" role="alert">{error}</p>}<Link href="/inscription" className="enrollment-back">Demander un nouveau lien</Link></section></EnrollmentFrame>;
}
