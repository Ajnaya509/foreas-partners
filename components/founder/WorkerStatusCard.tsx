import { workerStatus,usd } from './workerStatus';
import { dateLabel } from './presentation';
import styles from './founder.module.css';
export function WorkerStatusCard({output,now}:{output:unknown;now:number}){
 const v=workerStatus(output,now);
 if(!v)return <p className={styles.info}>Le suivi du service n’a pas pu être vérifié.</p>;
 const r=v.report;
 const phase=r?({checking:'Vérification du démarrage',ready:r.active?'Activité déclarée':'Le service se déclare prêt',working:'Activité déclarée',waiting_access:'Accès manquant',waiting_budget:'Budget insuffisant',needs_attention:'Vérification nécessaire',stopped:'Service arrêté'} as Record<string,string>)[r.phase]:'';
 return <section className={styles.workerStatus} aria-label="Suivi du service de correction">
  <h3>{v.effectiveState==='unknown'?'État inconnu':v.effectiveState==='stale'?'État ancien':phase}</h3>
  {r&&<><p>{v.effectiveState==='stale'?'Dernier état déclaré : '+phase+'. ':''}Signal du {dateLabel(r.reportedAt)}.</p><p>Reçu le {dateLabel(v.receivedAt)}.</p></>}
  <p>{v.effectiveState!=='recent'?'Demande un nouveau suivi pour vérifier la connexion du service.':v.nextAction||'Aucune intervention demandée par ce signal.'}</p>
  {r?.budget?<div className={styles.info}><strong>{v.effectiveState==='stale'?'Dernier budget déclaré':'Budget déclaré'}</strong><p>Journée {r.budget.date}, heure UTC.</p>
   <p>{usd(r.budget.chargedOrReservedMicroUsd)} dépensés ou réservés sur {usd(r.budget.dailyMicroUsd)}.</p><p>{r.budget.calls} appels utilisés sur {r.budget.dailyCalls}.</p>
   <p>Plafond par appel : {usd(r.maximumCallMicroUsd)}.</p><p>Ce service seulement. USD hors taxes. Ce n’est pas le solde Stripe.</p>
  </div>:<p>Budget indisponible.</p>}
  <p className={styles.small}>État déclaré par le service. Ni sa facture ni sa disponibilité ne sont vérifiées indépendamment.</p><p>Aucune correction appliquée par ce suivi.</p>
 </section>;
}
