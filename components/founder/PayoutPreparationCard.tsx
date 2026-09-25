import styles from './founder.module.css';
/** The server flags describe availability; this help card never grants authority. */
export function PayoutPreparationCard({available=false}:{available?:boolean}){
 return <section className={styles.card} aria-label="Versement indisponible"><div className={styles.actionBody}>
  <h3>Versement bancaire</h3><p className={styles.info}>{available?'Demande d’abord une préparation avec un montant précis.':'Le raccordement des versements n’est pas encore disponible.'}</p>
  <p>La fiche indique le montant exact, le compte, la banque masquée, la revue tarifaire et la durée de validité.</p>
  <p>Ton accord récent sera demandé avant tout envoi.</p><p>Aucun ordre envoyé. Aucune arrivée d’argent confirmée.</p>
 </div></section>;
}
