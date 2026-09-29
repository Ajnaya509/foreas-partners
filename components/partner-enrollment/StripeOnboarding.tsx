'use client';

import {useEffect,useState} from 'react';
import {loadConnectAndInitialize} from '@stripe/connect-js/pure';
import type {StripeConnectInstance} from '@stripe/connect-js';
import {ConnectAccountOnboarding,ConnectComponentsProvider} from '@stripe/react-connect-js';

export function StripeOnboarding({publishableKey,userId,onExit,onFallback,busy}:{publishableKey:string;userId:string;onExit:()=>void;onFallback:()=>void;busy:boolean}){
  const [instance,setInstance]=useState<StripeConnectInstance|null>(null);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    const connect=loadConnectAndInitialize({
      publishableKey,
      locale:'fr-FR',
      appearance:{variables:{fontFamily:'Inter, sans-serif',colorPrimary:'#007aff',colorBackground:'#ffffff',colorText:'#1d1d1f',colorSecondaryText:'#686873',buttonPrimaryColorBackground:'#007aff',buttonPrimaryColorBorder:'#007aff',buttonPrimaryColorText:'#ffffff',formAccentColor:'#007aff',borderRadius:'8px'}},
      fetchClientSecret:async()=>{
        const response=await fetch('/api/partner-enrollment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify({action:'session',userId})});
        const data=await response.json();
        if(!response.ok||typeof data.clientSecret!=='string')throw new Error(data.error||'Stripe ne peut pas ouvrir le formulaire. Réessaie dans un instant.');
        return data.clientSecret;
      },
    });
    if(active)setInstance(connect);
    return()=>{active=false;setInstance(null);};
  },[publishableKey,userId]);

  return <div className="enrollment-stripe-embedded" aria-label="Formulaire sécurisé Stripe">
    <p className="enrollment-caption">Cette étape se déroule ici, dans FOREAS. Stripe protège directement tes informations d’identité et de versement.</p>
    {error&&<p className="enrollment-error" role="alert">{error}</p>}
    {instance?<ConnectComponentsProvider connectInstance={instance}><ConnectAccountOnboarding onExit={onExit} onLoadError={()=>setError('Le formulaire Stripe ne s’affiche pas. Réessaie dans un instant.')} /></ConnectComponentsProvider>:<p role="status">Ouverture du formulaire sécurisé…</p>}
    <p className="enrollment-caption">Si le formulaire reste bloqué, ouvre-le directement chez Stripe. Tu reviendras ensuite ici.</p>
    <button type="button" className="enrollment-secondary" disabled={busy} onClick={onFallback}>{busy?'Ouverture…':'Ouvrir chez Stripe'}</button>
    <button type="button" className="enrollment-back" onClick={onExit}>Terminer plus tard</button>
  </div>;
}
