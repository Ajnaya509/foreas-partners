/** This policy only applies to partners who join this new programme. */
export const ENROLLMENT_POLICY = 'FOREAS_PARTNER_2026_09_24';
export const MONTHLY_COMMISSION_CENTS = 1000;
export const ANNUAL_COMMISSION_CENTS = 5000;
export const PROFILES = [
  ['driver', 'Chauffeur'], ['training', 'Centre de formation'], ['rental', 'Loueur'],
  ['fleet', 'Flotte'], ['community', 'Communauté'], ['creator', 'Créateur de contenu'],
  ['professional', 'Autre professionnel'],
] as const;
export const TERMS = `FOREAS — Conditions du programme partenaire
Version du 24 septembre 2026

1. Ton rôle
Tu recommandes l’abonnement FOREAS Driver avec ton lien personnel. Tu restes indépendant et ne peux pas engager FOREAS, négocier en son nom ou promettre des résultats. Le programme ne donne pas accès à l’abonnement chauffeur Premium. La création du compte est gratuite. L’ouverture des versements dépend de ton éligibilité et des vérifications Stripe.

2. Ton lien et l’attribution
Un seul apporteur est retenu pour un chauffeur. Son attribution doit être confirmée avant son premier paiement. Une attribution existante est conservée. Un clic, une inscription et un essai ne sont pas des paiements. L’auto-parrainage, les faux comptes et les achats annulés sont exclus.

3. Tes commissions
Tu peux recevoir 10 € par mois effectivement payé et admissible pour chaque chauffeur attribué à ton lien. Le premier mois reste conditionnel jusqu’au paiement confirmé du deuxième mois et au début de cette deuxième période. À ce moment, les deux premiers mois représentent 20 € admissibles si leurs paiements sont conservés. Sans deuxième mois payé, le premier mois n’est pas payable. Pour un abonnement annuel, la commission est de 50 € une seule fois après le premier paiement annuel admissible et conservé. Aucun montant ni nombre de filleuls n’est garanti. Un remboursement, un impayé ou un litige peut bloquer ou corriger la commission concernée. Les droits déjà acquis ne disparaissent pas à cause d’une résiliation future.

4. Stripe et versements
Stripe recueille directement ton identité et tes coordonnées bancaires. Une commission conditionnelle, une somme admissible, un transfert vers Stripe et un virement bancaire sont quatre étapes différentes. Les dates et états affichés dans ton espace font foi sur l’avancement. Un transfert dépend notamment des vérifications Stripe et des fonds disponibles. Aucun retrait instantané n’est garanti. Aucun nouveau frais ne peut être déduit du barème accepté sans accord. Les vérifications légales et fiscales restent applicables à ton activité.

5. Communication
Présente clairement ta recommandation comme rémunérée. Utilise les informations et supports validés. N’invente ni gains garantis, ni avis clients, ni accès gratuit. Respecte les choix des destinataires et les règles applicables à tes communications. Tu n’accèdes pas aux données privées des chauffeurs.

6. Arrêter ou suspendre
Tu peux arrêter de participer à tout moment en écrivant à contact@foreas.xyz. FOREAS peut également mettre fin au programme ou à la participation d’un partenaire, en l’en informant. Une fraude, un abus ou un manquement peut entraîner une suspension immédiate des opérations concernées. Ces décisions ne suppriment pas les commissions déjà acquises sur des paiements admissibles et conservés. Les corrections liées à un remboursement ou à une fraude restent possibles. Aucune modification future ne remplace rétroactivement le barème de droits déjà constitués.

7. Compte, données et assistance
Ton compte FOREAS reste le même sur le site et dans l’application. Tu conserves la responsabilité de tes déclarations fiscales et sociales. FOREAS conserve la version des conditions acceptées, la date de ton accord et les données nécessaires à l’exécution du programme. La politique de confidentialité détaille tes droits. Les actualités commerciales sont facultatives et distinctes de ton accord au programme. Pour une question, une contestation ou la clôture de ton compte : contact@foreas.xyz.
`;
export type Enrollment = {
  user_id: string; partner_id: string; name: string; profile: string; country: string;
  status: 'draft' | 'ready' | 'paused'; terms_version: string | null; terms_hash: string | null;
  accepted_at: string | null; connect_operation: string; stripe_account_id: string | null;
  connect_started_at: string | null; connect_state: 'not_started' | 'incomplete' | 'pending' | 'ready' | 'unavailable';
  connect_checked_at: string | null; connect_error: string | null; mode: 'live' | 'test'; created_at: string;
};
export type EnrollmentState = {
  signedIn: boolean; email?: string; userId?: string; legacy?: boolean; name?: string;
  enrollment?: Pick<Enrollment, 'partner_id' | 'name' | 'profile' | 'country' | 'status' | 'terms_version' | 'accepted_at' | 'connect_state' | 'connect_checked_at' | 'connect_error'>;
  code?: string | null; link?: string | null; error?: string; ready?: boolean;
  finance?: {conditional: number; eligible: number; blocked: number; referrals: number; observedAt: string; items: {id: string; kind: 'monthly'|'annual'; amount_cents: number; state: 'conditional'|'eligible'|'blocked'; created_at: string}[]};
};
export const enrollmentError = (code: string) => ({
  AUTH_REQUIRED: 'Connecte-toi pour reprendre ton inscription.',
  EMAIL_UNCONFIRMED: 'Confirme ton adresse email avec le lien reçu.',
  EXISTING_PARTNER: 'Ce compte possède déjà un espace partenaire. Ouvre-le pour retrouver tes conditions actuelles.',
  TERMS_CHANGED: 'Les conditions ont évolué. Relis-les avant de continuer.',
  CONDITIONS_REQUIRED: 'Accepte les conditions avant de configurer tes versements.',
  PROFILE_INVALID: 'Vérifie ton prénom, ton activité et ton pays.',
  RATE_LIMITED: 'Un lien vient d’être demandé. Patiente quelques minutes avant de recommencer.',
  MAIL_UNAVAILABLE: 'L’email n’a pas pu être envoyé. Réessaie dans quelques minutes.',
  MAIL_CONFIRMATION_UNCERTAIN: 'L’envoi n’a pas pu être confirmé. Vérifie ta boîte mail avant de réessayer.',
  STRIPE_APPROVAL_REQUIRED: 'Stripe doit encore autoriser les comptes de versement FOREAS. Ton inscription est enregistrée. Nous t’aiderons à la terminer.',
  CONNECT_UNCERTAIN: 'La création du compte Stripe doit être vérifiée. Ton inscription est conservée. Contacte-nous pour reprendre.',
  CONNECT_BUSY: 'La création du compte Stripe est en cours. Patiente puis actualise.',
  CONNECT_UNAVAILABLE: 'Stripe ne répond pas pour le moment. Ta progression est enregistrée.',
  SERVICE_UNAVAILABLE: 'L’inscription est momentanément indisponible. Réessaie dans quelques minutes.',
  PROGRAMME_NOT_OPEN: 'L’inscription n’est pas encore ouverte. Contacte contact@foreas.xyz pour être accompagné.',
  INVALID_REQUEST: 'Cette demande ne peut pas être traitée. Recharge la page.',
  IDENTITY_CONFLICT: 'Ton compte a changé. Recharge la page avant de continuer.',
} as Record<string, string>)[code] || 'Ta demande n’a pas abouti. Réessaie dans quelques minutes.';
