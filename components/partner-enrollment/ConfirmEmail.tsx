'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {EnrollmentFrame} from './EnrollmentFrame';
export function ConfirmEmail({hash,type}:{hash:string;type:string}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false);
  useEffect(()=>{window.history.replaceState(null,'','/inscription/confirmation');},[]);
  async function confirm(){setBusy(true);setError('');try{const r=await fetch('/api/partner-enrollment/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({hash,type}),signal:AbortSignal.timeout(20000)});const data=await r.json();if(!r.ok)throw new Error(data.error);setConfirmed(true);
    // Reload the document so the new server session also replaces any previous
    // account held by the browser's authentication client.
    window.location.replace('/inscription?email=confirme');
  }catch(e){setError(e instanceof Error&&e.name!=='TimeoutError'?e.message:'La connexion prend trop de temps. Réessaie pour continuer.');setBusy(false);}}
  return <EnrollmentFrame><section className="enrollment-card"><p className="enrollment-kicker">Ton compte FOREAS</p><h1>{confirmed?'Ton adresse est confirmée.':'Valide ton adresse.'}</h1><p>{confirmed?'Ton inscription reprend à l’étape suivante.':'Clique ci-dessous pour confirmer ton adresse. Tu pourras ensuite compléter ton profil et préparer tes versements.'}</p>{confirmed?<a href="/inscription?email=confirme" className="enrollment-primary">Continuer mon inscription</a>:hash&&['signup','magiclink'].includes(type)?<button className="enrollment-primary" disabled={busy} onClick={confirm}>{busy?'Confirmation en cours…':'Confirmer et continuer'}</button>:<p role="alert">Ce lien est incomplet. Ouvre le dernier email reçu.</p>}{error&&<p className="enrollment-error" role="alert">{error}</p>}{!confirmed&&<Link href="/inscription" className="enrollment-back">Demander un nouveau lien</Link>}</section></EnrollmentFrame>;
}
