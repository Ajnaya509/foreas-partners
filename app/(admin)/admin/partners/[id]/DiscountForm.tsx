"use client";
import { useRef,useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePartnerDiscount } from './actions';
import { discountSchema,type AdminPartner } from '@/lib/partner/admin-program';
import { PROMESSE_PARRAINAGE } from '@/lib/parrainagePromesse';
import { useRequestGuard } from '@/components/partner/useRequestGuard';

type Props={partner:AdminPartner};
const field='w-full min-h-12 rounded-lg border border-glass-border bg-glass-low px-md py-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-electric';
export function DiscountForm({partner}:Props){
  const router=useRouter(),guard=useRequestGuard(),busy=useRef(false);
  const [message,setMessage]=useState(partner.landing_message??'');
  const [heroUrl,setHeroUrl]=useState(partner.landing_hero_url??'');
  const [error,setError]=useState(''),[saved,setSaved]=useState(false),[pending,startTransition]=useTransition();
  function submit(event:React.FormEvent){
    event.preventDefault();if(busy.current)return;
    setError('');setSaved(false);
    const input=discountSchema.safeParse({landing_message:message.trim()||null,landing_hero_url:heroUrl.trim()||null});
    if(!input.success){setError('Vérifiez la présentation et l’adresse HTTPS de l’image.');return;}
    busy.current=true;const current=guard();
    startTransition(async()=>{try{await updatePartnerDiscount(partner.id,input.data);if(current()){setSaved(true);router.refresh();}}
      catch{if(current())setError('L’enregistrement n’a pas été confirmé. Actualisez le dossier avant de recommencer.');}
      finally{busy.current=false;}});
  }
  return <form onSubmit={submit} className="space-y-lg text-text-secondary">
    <p>{PROMESSE_PARRAINAGE}</p><p>Votre lien offre 10 % au chauffeur à chaque renouvellement, mensuel ou annuel. La commission reste celle du programme. Vous pouvez personnaliser la présentation ci-dessous.</p>
    <p>Ils ne valident pas une admission. Le compte et les conditions doivent être confirmés avant tout partage.</p>
    <fieldset disabled={pending} className="space-y-lg disabled:opacity-60">
      <div><label htmlFor="partner-message" className="block mb-sm">Présentation de l’offre, facultative</label><textarea id="partner-message" maxLength={2000} rows={3} value={message} onChange={e=>setMessage(e.target.value)} className={field}/><p>Le prix et la remise doivent rester ceux confirmés au paiement.</p></div>
      <div><label htmlFor="partner-image" className="block mb-sm">Adresse HTTPS d’une image autorisée, facultative</label><input id="partner-image" type="url" value={heroUrl} onChange={e=>setHeroUrl(e.target.value)} className={field}/></div>
      <button type="submit" className="font-display min-h-12 px-lg rounded-lg border border-glass-border bg-glass-low text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-electric">{pending?'Enregistrement…':'Enregistrer la présentation'}</button>
    </fieldset>
    {saved&&<p role="status">La présentation est enregistrée. Cela ne confirme ni une admission ni un versement.</p>}
    {error&&<div role="alert"><p>{error}</p><button type="button" className="font-display min-h-12 underline" onClick={()=>router.refresh()}>Actualiser le dossier</button></div>}
  </form>;
}
