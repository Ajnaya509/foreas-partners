import { missionControlResult,observedMissionLabel } from './missionControlResult';
import { dateLabel } from './presentation';
import styles from './founder.module.css';

const needs={access:'Accès manquant',approval:'Accord nécessaire',information:'Information manquante',capability:'Fonction indisponible',verification:'Vérification nécessaire'};
export function MissionControlCard({step,sourceMissionId,busy,openTarget}:{step:Record<string,unknown>;sourceMissionId:string;busy:boolean;openTarget:(id:string)=>void}){
 const v=missionControlResult(step,sourceMissionId);
 if(!v)return <p className={styles.info}>Le résultat de cette demande n’a pas pu être vérifié. Relis son suivi.</p>;
 const r=v.kind==='control'?v.receipt:null,c=v.current;
 return <section className={styles.workerStatus} aria-label="Résultat du contrôle de mission">
  {r&&<><p><strong>Commande enregistrée : </strong>{{pause:'Pause',continue:'Levée de pause',cancel:'Demande d’annulation'}[r.command]}.</p>
   <p>Enregistrée le {dateLabel(r.appliedAt)}.</p><p>Aucun accès ni accord renouvelé par cette commande.</p></>}
  <h3>Mission concernée</h3><p className={styles.prewrap}>{c.missionId}</p>
  <p><strong>Dernier état observé : {observedMissionLabel(c)}.</strong></p>
  <p>Consigne observée : {{run:'Poursuite demandée',pause:'En pause',cancel:'Annulation demandée'}[c.control]}.</p>
  <p>État mis à jour le {dateLabel(c.updatedAt)}.</p><p>État relu le {dateLabel(v.observationAt)}.</p>
  {r&&r.afterControl!==c.control&&<p className={styles.info}>Une consigne plus récente a remplacé celle de ce reçu. L’ancienne commande n’est pas répétée.</p>}
  {c.uncertain&&<p>Le résultat d’une action reste incertain. Ce suivi ne confirme pas son succès.</p>}
  {c.executing&&<p>Une action déjà partie peut encore se terminer.</p>}
  {c.needs.length>0&&<><p>La mission attend encore :</p><ul>{c.needs.map(n=><li key={n}>{needs[n]}</li>)}</ul></>}
  <p className={styles.small}>État conservé à cette date. La réussite de cette demande ne prouve pas celle de la mission concernée.</p>
  <button className={styles.button} disabled={busy} onClick={()=>openTarget(c.missionId)}>Voir cette mission</button>
  <details><summary>Détails du résultat conservé</summary><pre>{JSON.stringify(step.result,null,2)}</pre></details>
 </section>;
}
