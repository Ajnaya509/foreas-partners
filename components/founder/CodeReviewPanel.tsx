import type { CodeReview } from '@/lib/founder/brain/codeReview';
import { dateLabel } from './presentation';
import styles from './founder.module.css';

export function CodeReviewPanel({review}:{review:CodeReview}){
 const a=review.artifact;
 const checkLabel=(c:typeof a.verification.checks[number])=>c.timedOut?'Délai dépassé':c.oomKilled?'Mémoire dépassée':c.exitCode===0?'Réussi':'Échec';
 return <div className={styles.reviewContent}>
  <p className={styles.info}><strong>Aucun changement appliqué.</strong> Une relecture humaine reste nécessaire.</p>
  {review.mode==='test'&&<p>Proposition issue d’une simulation.</p>}
  {review.jobState!=='ready'&&<p className={styles.info}>Dossier historique · {({cancelled:'Travail annulé',paused:'Travail en pause',needs_attention:'Vérification nécessaire',queued:'Travail en attente',running:'Travail en cours'} as Record<string,string>)[review.jobState]||'État à vérifier'}. Cette lecture ne reprend pas le travail.</p>}
  <h3>La demande</h3><p className={styles.prewrap}>{review.brief}</p>
  <p>Projet : {a.projectId}</p><p>Préparé le {dateLabel(a.createdAt)} · Consulté le {dateLabel(review.readAt)}</p>
  <h3>Les contrôles</h3><p>{a.verification.checks.length} contrôles réussis. Ils ne garantissent pas toute la qualité de la correction.</p>
  <ul>{a.verification.checks.map(c=><li key={c.id}>{c.id} : {checkLabel(c)} · Avant : {checkLabel(a.baseline.checks.find(b=>b.id===c.id)!)}</li>)}</ul>
  <h3>Les changements proposés</h3>
  {a.changes.map(c=><section key={c.path} className={styles.codeFile}><h4>{c.path}</h4><div className={styles.codeColumns}>
   <div><h5>Avant</h5><pre><code>{c.beforeContent===null?'Nouveau fichier autorisé':c.beforeContent}</code></pre></div>
   <div><h5>Proposition</h5><pre><code>{c.content}</code></pre></div>
  </div></section>)}
  <details><summary>Détails des vérifications</summary><p>Version préparée : {a.revision}</p><p>Le projet réel a pu changer depuis.</p><p>{a.rounds} essai(s) de préparation.</p>
   {review.policy.checks.map(c=><div key={c.id}><p>{c.id}</p><pre>{c.argv.join(' ')}</pre></div>)}
   <p>Empreinte du dossier : {review.artifactHash}</p>
  </details>
 </div>;
}
