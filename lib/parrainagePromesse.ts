/**
 * LA PHRASE DU PARRAINAGE — une seule, partout — portail partenaire
 * ============================================================================
 *
 * Copie fidèle de la source de vérité de l'app
 * (`FOREAS-Clean/src/config/parrainagePromesse.ts`, politique du 21/08/2026),
 * portée ici parce que les deux dépôts ne partagent aucun paquet.
 *
 * ## Ce que la mesure du 28/08 a trouvé dans CE dépôt
 *
 * Deux pages promettaient **« 25 €/sem × chauffeur actif »** :
 *
 *   app/(partner)/partner/recrutement/page.tsx
 *   app/(partner)/partner/commissions/page.tsx
 *
 * Ce n'est pas seulement un autre montant : c'est une autre STRUCTURE.
 * 25 €/semaine par chauffeur actif vaut environ 108 €/mois et par tête, à vie.
 * La règle réelle donne 5 €/mois payé, ou 50 € une seule fois. L'écart est
 * d'un facteur vingt, et il était affiché à des partenaires réels.
 *
 * Le contrat du dossier partenaire (§8) l'interdit nommément :
 * « Sont interdits : revenu garanti, projection fabriquée, trois niveaux,
 * cascade, 25/35/50 €, 10/4/2 €, remise filleul non décidée et commission
 * sur essai. »
 *
 * ## La règle
 *
 * Elle est la MÊME pour le chauffeur qui parraine et pour le partenaire
 * recruteur. Il n'y a pas deux barèmes — c'était la deuxième confusion.
 *
 * ## La règle d'usage
 *
 * Aucune page ne réécrit cette phrase : elle l'importe. Une phrase recopiée
 * finit toujours par être recopiée de travers.
 */

/** La version de politique. Elle voyage avec la phrase, pour qu'on sache d'où elle vient. */
export const POLITIQUE_PARRAINAGE = 'FOREAS_REFERRAL_POLICY_V2026_08_21'

/** Le texte complet canonique (contrat partenaire §8). */
export const PROMESSE_PARRAINAGE =
  '5 € pour chaque mensualité réellement payée et admissible. 50 € une seule fois après ' +
  'le premier annuel payé et admissible. Les droits mensuels admissibles sont versés le mois suivant, ' +
  'si le compte de versement est prêt.'

/**
 * Le texte court canonique. Il garde les QUATRE faits obligatoires :
 * 50 € · annuel · une seule fois · 5 € par mois payé, le mois suivant.
 * En retirer un seul rend la phrase fausse.
 */
export const PROMESSE_PARRAINAGE_COURTE =
  '50 € une fois sur l’annuel. 5 € par mois payé sur le mensuel, versés le mois suivant.'

/**
 * Ce qu'on ne promet JAMAIS. Cette liste n'est pas décorative : elle existe
 * pour qu'une recherche sur un de ces mots retombe ici, sur l'explication,
 * plutôt que sur une page qui les affiche encore.
 */
export const JAMAIS_PROMIS = [
  '25 €/sem',
  '25 € par semaine et par chauffeur actif',
  'niveaux N1 / N2 / N3',
  'cascade',
  '10 € / 4 € / 2 €',
  '25 € / 35 € / 50 € par paliers',
  'un revenu garanti',
  'une projection fabriquée',
  'une commission sur un essai gratuit',
] as const
