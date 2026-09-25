"use client";
import {useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {approveApplication,rejectApplication,resendApplicationInvitation} from './actions';
import {invitationLabels,type AdmissionResult} from '@/lib/partner/admission';

const buttonClass='min-h-12 px-lg rounded-lg border border-glass-border disabled:opacity-50';
export function ApplicationActions({applicationId,companyName}:{applicationId:string;companyName:string}){
 const router=useRouter();const [result,setResult]=useState<AdmissionResult|null>(null);
 const [refused,setRefused]=useState(false),[error,setError]=useState(''),[sendInvitation,setSendInvitation]=useState(false);
 const [acknowledge,setAcknowledge]=useState(false),[retryError,setRetryError]=useState('');
 const retryRequest=useRef<string|null>(null);
 const [pending,startTransition]=useTransition();
 function approve(){startTransition(async()=>{setError('');try{
  const r=await approveApplication(applicationId,sendInvitation);
  if(r.ok)setResult(r.admission);else setError(r.error);
 }catch{setError('Le résultat n’a pas été confirmé. Actualisez le dossier avant de recommencer.');}});}
 function refreshAdmission(){router.refresh();setResult(null);setRetryError('');}
 function resend(){if(!acknowledge||pending)return;startTransition(async()=>{
  setRetryError('');try{
   retryRequest.current??=crypto.randomUUID();
   const r=await resendApplicationInvitation(applicationId,retryRequest.current,true);
   if(r.ok){setResult(r.admission);setAcknowledge(false);retryRequest.current=null;}
   else setRetryError(r.error);
  }catch{setRetryError('Le nouvel envoi reste à vérifier. Réessayez ici pour retrouver la même demande.');}
 });}
 function reject(){startTransition(async()=>{setError('');try{
  const r=await rejectApplication(applicationId);if(r.ok)setRefused(true);else setError(r.error??'Le refus n’a pas été confirmé.');
 }catch{setError('Le refus n’a pas été confirmé.');}});}
 if(result)return <div className="text-text-secondary space-y-sm">
  <div role="status"><p className="font-semibold">{companyName} : {result.admission.state==='active'?'partenaire actif.':'Admission préparée, confirmation du compte attendue.'}</p><p>{invitationLabels[result.admission.invitation]}</p></div>
  <p>Les conditions et les informations de versement se vérifient dans l’espace partenaire.</p>
  <button className={buttonClass} onClick={refreshAdmission} disabled={pending}>Actualiser le dossier</button>
  {result.admission.state==='awaiting_identity'&&result.admission.invitation!=='not_requested'&&<div className="space-y-sm border-t border-glass-border pt-md">
   <p>Invitation perdue ou expirée ? Un nouvel envoi peut remplacer le précédent lien. Utilisez le dernier courriel reçu.</p>
   <p>Attendez quinze minutes entre deux demandes d’envoi.</p>
   <label className="flex items-center gap-sm min-h-12"><input type="checkbox" checked={acknowledge} onChange={e=>setAcknowledge(e.target.checked)} disabled={pending}/>J’ai vérifié le dossier et je demande un nouvel envoi.</label>
   <button className={buttonClass+' bg-glass-low'} onClick={resend} disabled={pending||!acknowledge}>{pending?'Vérification…':'Renvoyer l’invitation'}</button>
  </div>}
  {retryError&&<p role="alert">{retryError}</p>}
 </div>;
 if(refused)return <p role="status" className="text-text-secondary">Le refus de la candidature de {companyName} est enregistré.</p>;
 if(error)return <div role="alert" className="space-y-sm"><p className="text-text-secondary">{error}</p><button className={buttonClass+' text-text-secondary'} onClick={()=>{router.refresh();setError('');}}>Actualiser et revenir aux actions</button></div>;
 return <div className="space-y-md text-text-secondary"><label className="flex items-center gap-sm min-h-12"><input type="checkbox" checked={sendInvitation} onChange={e=>setSendInvitation(e.target.checked)} disabled={pending}/>Envoyer aussi une invitation par courriel</label><div className="flex flex-wrap gap-sm"><button onClick={approve} disabled={pending} className={buttonClass+' bg-glass-low'}>{pending?'Enregistrement…':sendInvitation?'Préparer et envoyer l’invitation':'Préparer l’admission'}</button><button onClick={reject} disabled={pending} className={buttonClass}>Refuser la candidature</button></div></div>;
}
