import type { GatewayActionView, GatewayMissionView } from '@/lib/founder/brain/gateway';
import { actionDeadline, canApproveAction } from '@/lib/founder/action';
import { payoutAccessResources, payoutManifest, payoutPreparation, payoutReceipt, euros, payoutSource } from '@/lib/founder/payout';
import { dateLabel, record } from './presentation';
import styles from './founder.module.css';

export function PayoutAccessScope({resources}:{resources:unknown}){
 const parsed=payoutAccessResources.safeParse(resources);
 if(!parsed.success)return <p>Le compte et la banque doivent être vérifiés.</p>;
 const r=parsed.data;
 return <><p>Compte Stripe : {r.accountId}</p><p>Banque : •••• {r.destinationLast4} · {r.destinationCountry}</p>
  <p>Source : {payoutSource(r.sourceType)}</p><p>Montant maximal préparé : {euros(r.maxAmountMinor)}</p>
  <p>{r.livemode?'Compte réel':'Compte d’essai'} · Versement standard en euros</p>
  <p>Cet accord permet de lire ce compte et cette banque. Il n’autorise aucun envoi d’argent.</p>
  <details><summary>Références de cette lecture</summary><pre>{JSON.stringify(r,null,2)}</pre></details></>;
}

export function PayoutResultCard({step,now}:{step:GatewayMissionView['steps'][number];now:number}){
 const result=record(step.result)?step.result:null;
 const preparation=step.capability==='stripe.payout.prepare';
 const parsed=preparation?payoutPreparation.safeParse(result?.output):payoutReceipt.safeParse(result?.output);
 const waiting=step.status==='uncertain'?'Résultat inconnu':step.status==='failed'?'Échec':step.status==='executing'?'Vérification en cours':preparation?'Préparation':'Accord ou vérification nécessaire';
 if(!parsed.success||step.status!=='succeeded')return <section className={styles.need} aria-label="Suivi du versement"><h3>{waiting}</h3>
  <p>{step.status==='uncertain'?'Un ordre a pu partir. Retrouve son résultat avant toute nouvelle demande.':step.status==='succeeded'?'La preuve de ce résultat ne peut pas être vérifiée.':'Le suivi ne confirme aucun nouvel ordre.'}</p>
  <p>L’arrivée en banque reste à vérifier.</p></section>;
 const output=parsed.data;
 // Only present a result when its saved evidence describes this same result.
 const evidence=Array.isArray(result?.evidence)?result.evidence.filter(record):[];
 const verified=evidence.length===1&&evidence.some(e=>{
  const other=preparation?payoutPreparation.safeParse(e.data):payoutReceipt.safeParse(e.data);
  if(!other.success||JSON.stringify(other.data)!==JSON.stringify(output))return false;
  if('preparation' in output)return e.kind==='draft'&&e.accountId===output.preparation.accountId&&e.observedAt===output.preparation.preparedAt
    &&e.source===(output.simulation?'simulation:':'')+'https://api.stripe.com/v1/account'&&typeof e.reference==='string'&&/^[a-f0-9]{64}$/.test(e.reference);
  return e.kind==='stripe.payout.observed'&&e.accountId===output.accountId&&e.observedAt===output.observedAt&&e.reference===output.payoutId
    &&e.source===(output.simulation?'simulation:':'')+'https://api.stripe.com/v1/payouts/'+output.payoutId;
 });
 if(!verified)return <section className={styles.need}><h3>Résultat à vérifier</h3><p>La preuve ne correspond pas à ce versement.</p></section>;
 if('preparation' in output){const r=output.preparation;return <section className={styles.need} aria-label="Préparation du versement"><h3>{output.simulation?'Simulation · ':''}Préparation de {euros(r.amountMinor)}</h3>
  <p>Compte Stripe : {r.accountId}</p><p>Banque : •••• {r.destinationLast4} · {r.destinationCountry}</p><p>Source : {payoutSource(r.sourceType)}</p>
  <p>Préparée le {dateLabel(r.preparedAt)}</p><p>Valable jusqu’au {dateLabel(r.expiresAt)}</p>
  {(Date.parse(r.preparedAt)>now||Date.parse(r.expiresAt)<=now)&&<p>Cette préparation n’est plus utilisable. Une nouvelle préparation est nécessaire.</p>}
  <p>Aucun ordre envoyé. L’accord de versement reste à donner.</p><p>La revue bancaire et tarifaire sera présentée dans la fiche d’accord.</p></section>;}
 return <section className={styles.need} aria-label="Résultat du versement"><h3>{output.simulation?'Simulation · ':''}Ordre envoyé · {euros(output.amountMinor)}</h3>
  <p>Banque : •••• {output.destinationLast4}</p><p>{output.providerStatus==='paid'?'Signalé comme payé par Stripe':output.providerStatus==='in_transit'?'En route selon Stripe':'En attente selon Stripe'}</p>
  <p>Reçu relu le {dateLabel(output.observedAt)}</p><p>L’arrivée en banque n’est pas confirmée.</p><p>Les frais constatés restent à vérifier.</p>
  <details><summary>Référence de l’ordre</summary><p>{output.payoutId}</p><p>Compte : {output.accountId}</p></details></section>;
}

export function PayoutActionCard({action,mission,available,busy,now,approve,revoke,close}:{action:GatewayActionView;mission:GatewayMissionView;
 available:boolean;busy:boolean;now:number;approve:()=>void;revoke:()=>void;close:()=>void}){
 const parsed=payoutManifest.safeParse(action.manifest);
 if(!parsed.success||action.missionId!==mission.id||action.planVersion!==mission.planVersion
   ||parsed.data.missionId!==mission.id||parsed.data.stepId!==action.stepId||parsed.data.planVersion!==mission.planVersion)
   return <section className={styles.card}><div className={styles.actionBody}><h3>Fiche de versement à vérifier</h3><p>Cette fiche ne permet aucun accord.</p><button onClick={close}>Fermer</button></div></section>;
 const m=parsed.data,deadline=actionDeadline(action),expired=deadline<=now||Date.parse(m.preparedAt)>now;
 return <section className={styles.card+' '+styles.payout} aria-label="Accord de versement"><div className={styles.cardHead}><strong>Autoriser ce versement de {euros(m.amountMinor)} ?</strong></div>
  <div className={styles.actionBody}><dl><div><dt>Compte Stripe</dt><dd>{m.accountId}</dd></div><div><dt>Banque</dt><dd>•••• {m.destinationLast4} · {m.destinationCountry}</dd></div>
   <div><dt>Source</dt><dd>{payoutSource(m.sourceType)}</dd></div><div><dt>Mode</dt><dd>Réel · Versement standard en euros</dd></div>
   <div><dt>Préparation</dt><dd>{dateLabel(m.preparedAt)}</dd></div><div><dt>Accord valable jusqu’au</dt><dd>{dateLabel(new Date(deadline).toISOString())}</dd></div></dl>
   <p>Revue bancaire et tarifaire datée du {dateLabel(m.financialReview.reviewedAt)}.</p>
   <p>Elle atteste cette banque et l’absence de frais supplémentaires pour cet ordre standard.</p>
   <p>Cette attestation vient d’une vérification opérateur. Elle n’est pas une certification automatique de Stripe.</p>
   <p>Débit total attendu : {euros(m.expectedTotalDebitMinor)}. Aucun plafond de frais n’est imposé à Stripe.</p>
   <p>L’ordre ne prouve pas l’arrivée en banque. Les frais constatés restent à vérifier.</p>
   {action.approval&&<p>{action.approval.consumedAt?'Accord utilisé. Vérifie le résultat de l’ordre.':action.approval.revokedAt?'Accord retiré.':'Accord enregistré. L’envoi reste à confirmer.'}</p>}
   {expired&&<p>Cette fiche a expiré ou sa date n’est plus valable. Relis le suivi avant toute nouvelle préparation.</p>}
   {!available&&<p>Les nouveaux accords de versement sont fermés.</p>}
   <details><summary>Références de la fiche</summary><p>Banque : {m.destinationId}</p><p>Contrat : {m.apiVersion}</p><p>Plan : {m.planVersion} · Action : {m.capabilityVersion}</p>
    <p>Revue valable jusqu’au {dateLabel(m.financialReview.expiresAt)}</p><pre>{JSON.stringify({fiche:action.manifestHash,portee:m.financialReview.scopeHash,preuve:m.financialReview.evidenceHash},null,2)}</pre></details>
   <div className={styles.cardButtons}>{available&&canApproveAction(action,mission,now)&&<button className={styles.primary} disabled={busy} onClick={approve}>Autoriser ce versement de {euros(m.amountMinor)}</button>}
    {action.approval&&!action.approval.consumedAt&&!action.approval.revokedAt&&!expired&&<button disabled={busy} onClick={revoke}>Retirer mon accord</button>}<button onClick={close}>Fermer</button></div>
   {action.approval?.consumedAt&&<p>Une pause ou un arrêt de cette mission n’annule pas l’ordre chez Stripe.</p>}
  </div></section>;
}
