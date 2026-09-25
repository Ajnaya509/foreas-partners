import { socialMetricsResult,socialAccessResources } from './socialMetricsResult';
import styles from './founder.module.css';
const socialDate=(value:string,timezone:string)=>new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'medium',timeZone:timezone}).format(new Date(value));

export function SocialMetricsCard({step,mode,now}:{step:Record<string,unknown>;mode:unknown;now:number}){
 if(step.status!=='succeeded')return null;
 const v=socialMetricsResult(step,mode,now);
 if(!v)return <p role="status">Résultat social indisponible. Le nombre de prospects reste inconnu.</p>;
 return <section className={`${styles.card} ${styles.socialMetrics}`} aria-label="Résultats du robot social"><div className={styles.actionBody}>
  <h3>{v.simulation?'Essai fictif du robot social':'Lecture du registre social'}</h3>
  {v.simulation&&<p>Aucun contact réel n’est compté dans cet essai.</p>}
  <p>Journée du {v.calendarDate} · {v.timezone}</p><p>Observation du {socialDate(v.observedAt,v.timezone)}. Couverture partielle.</p>
  <p>Messages acceptés par le fournisseur : <strong>{v.counts.providerAcceptedMessages}</strong>.</p>
  <p>Adresses externes distinctes déclarées : <strong>{v.counts.distinctExternalProspectsContacted}</strong>.</p>
  <p>Vrais prospects vérifiés : <strong>inconnu</strong>.</p>
  <p>Livraisons, lectures, réponses et conversions : non confirmées.</p>
  <p>Une adresse déclarée externe ne prouve ni une personne ni la réception du message.</p>
  <p>Places consommées : {v.consumedSlots}. Réservées : {v.reservedSlots}. Incertaines : {v.uncertainSlots}.</p>
  <p>Les réservations et incertitudes peuvent venir de jours précédents.</p>
  <p>Les nouveaux envois sont fermés. Les chiffres historiques restent conservés.</p>
  <details><summary>Périmètre et preuve de cette lecture</summary>
   <p>Robot : {v.robotRef}. Compte d’envoi : {v.providerAccountRef}.</p>
   <p>{v.purpose==='PRIVATE_HUNTER'?'Robot privé du chauffeur '+v.driverId:'Robot FOREAS'} · Version {v.scopeRevision}.</p>
   <p>Du {socialDate(v.periodStart,v.timezone)} au {socialDate(v.periodEnd,v.timezone)} · {v.timezone}.</p><p>{v.proofRefs[0]}</p>
   <p>Ce registre couvre uniquement les messages email enregistrés pour ce robot.</p>
   <p>Les autres robots, canaux et anciens historiques ne sont pas couverts.</p>
  </details>
 </div></section>;
}
export function SocialAccessScope({resources}:{resources:unknown}){
 const parsed=socialAccessResources.safeParse(resources);
 if(!parsed.success)return <p>Périmètre social non confirmé.</p>;
 const v=parsed.data;
 return <div className={styles.prewrap}><p>Robot : {v.robotRef}</p><p>Compte d’envoi : {v.providerAccountRef}</p>
  <p>{v.purpose==='PRIVATE_HUNTER'?'Robot privé du chauffeur '+v.driverId:'Robot FOREAS'} · Email</p>
  <p>Fuseau : {v.timezone} · Version {v.revision} · {v.environment==='test'?'Essai fictif':'Registre réel'}</p>
  <p>Cet accord permet seulement de lire ce registre. Il ne permet aucun envoi ni changement de quota.</p></div>;
}
