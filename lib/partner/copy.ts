export const partnerCopy = {
  brand:'Espace partenaire', skip:'Aller au contenu', localPreview:'Aperçu local · aucun compte ni argent réel',
  nav:{accueil:'Accueil',partager:'Partager',gains:'Mes gains',aide:'Aide'},
  titles:{accueil:'Faites découvrir FOREAS Driver.',partager:'Le bon support, pour vos chauffeurs.',gains:'Vos commissions, au bon état.',aide:'Des réponses pour avancer.'},
  intros:{accueil:'Retrouvez votre lien, vos supports et vos commissions au même endroit. Vérifiez les conditions de votre compte avant de partager.',partager:'Choisissez votre activité, puis un support utile. Vérifiez les conditions applicables à votre compte.',gains:'Consultez vos droits et les transferts confirmés dans le registre.',aide:'Le programme, les réponses et les informations de votre compte.'},
  policy:'Le montant applicable est celui de vos conditions vérifiées. Vos droits déjà enregistrés restent visibles dans votre relevé.',
  policyNote:'Commission pour l’apporteur direct. Aucun revenu garanti. Les droits mensuels sont versés le mois suivant, selon les conditions du programme.',
  noLink:'Votre lien personnel n’est pas encore disponible. Les conditions et l’admission doivent être confirmées avant de partager.',
  coverage:'Ces montants couvrent le registre actuel. L’ancien historique n’a pas encore été rapproché : ce n’est pas un total de toute votre relation avec FOREAS.',
  refresh:'Réessayer',help:'Voir les réponses',copy:'Copier le message',copied:'Message copié',copyLink:'Copier mon lien',linkCopied:'Lien copié',copyFailed:'La copie n’a pas abouti. Sélectionnez le texte pour le copier.',
  commissionStates:{pending_review:'À vérifier',eligible:'Admissible',reserved:'Réservé',paid:'Transféré',blocked:'À résoudre',reversed:'Droit corrigé',policy_unmapped:'Historique à vérifier'},
  accountStates:{not_connected:'Informations de versement à renseigner',incomplete:'Informations de versement à compléter',ready:'Compte de versement vérifié',unavailable:'État du compte de versement indisponible'},
  admissionStates:{pending:'Candidature en cours',active:'Partenaire admis',paused:'Partenariat en pause',unknown:'Statut à vérifier'},
  errors:{
    AUTH_REQUIRED:{title:'Retrouvez votre espace.',text:'Connectez-vous avec le compte lié à votre candidature.'},
    PARTNER_NOT_FOUND:{title:'Votre dossier n’est pas encore relié.',text:'Votre connexion ne correspond pas encore à un dossier partenaire. Retrouvez votre demande et contactez votre interlocuteur FOREAS.'},
    IDENTITY_CONFLICT:{title:'Votre dossier doit être vérifié.',text:'Plusieurs informations de compte se contredisent. Votre interlocuteur FOREAS doit les rapprocher avant de poursuivre.'},
    PARTNER_NOT_ADMITTED:{title:'Votre candidature est en cours.',text:'Le partage et les commissions seront accessibles lorsque votre admission sera confirmée.'},
    PARTNER_INACTIVE:{title:'Votre partenariat est en pause.',text:'Le partage est arrêté. Vos droits déjà enregistrés restent consultables selon votre accès.'},
    SERVICE_UNAVAILABLE:{title:'Ces informations ne sont pas disponibles.',text:'Nous n’affichons pas de zéro à la place d’une erreur. Réessayez dans un instant.'},
    PREVIEW_NO_ACCOUNT:{title:'Votre activité apparaîtra ici.',text:'Cet aperçu ne consulte aucun compte. Les liens personnels et les gains apparaîtront à partir des informations vérifiées.'},
  },
  faq:[
    {q:'Que puis-je expliquer sur FOREAS Driver ?',a:'Présentez une fonction que vous avez réellement vue fonctionner. FOREAS aide le chauffeur à lire les propositions reconnues. Le chauffeur garde sa décision. La compatibilité et les conditions actuelles se vérifient avant l’essai.'},
    {q:'Combien puis-je recevoir ?',a:'Consultez les conditions publiées pour votre compte et votre relevé. Un clic, une inscription ou un essai ne constituent pas une commission payable.'},
    {q:'Quand une commission est-elle payée ?',a:'La date prévue dépend des conditions de votre compte. Une commission à vérifier, admissible ou réservée n’est pas un transfert confirmé. Un transfert confirmé ne prouve pas son arrivée en banque. La date exacte est affichée seulement lorsqu’elle est communiquée. Les informations de versement doivent être complètes.'},
    {q:'Dois-je signaler ma commission ?',a:'Oui. Dites clairement que votre recommandation peut vous rémunérer. Dans une publication commerciale, la mention doit être visible immédiatement. Ne transformez pas un exemple en témoignage client.'},
    {q:'Quel avantage mon lien donne-t-il au chauffeur ?',a:'Le chauffeur voit son avantage et le prix applicable avant de payer. Vérifiez les conditions de votre compte avant de lui annoncer une remise ou un montant de commission.'},
    {q:'Puis-je voir les revenus des chauffeurs ?',a:'Cet espace de recommandation présente votre programme et vos commissions. Il ne donne pas accès aux courses, à la position ou aux revenus privés des chauffeurs.'},
    {q:'Que se passe-t-il après un remboursement ?',a:'Une facture remboursée ou contestée peut empêcher le paiement ou entraîner une correction selon les conditions. Le relevé précise le changement du droit. Un transfert antérieur reste visible et demande un rapprochement ; la correction ne prouve pas une récupération bancaire.'},
    {q:'Je veux arrêter de recommander FOREAS.',a:'Arrêtez vos partages et signalez votre demande à votre interlocuteur FOREAS. Les droits déjà acquis et l’arrêt des droits futurs suivent les conditions acceptées. Retirez les anciens supports qui ne correspondent plus au programme.'},
    {q:'Ma flotte souhaite financer les accès.',a:'L’achat d’accès par une flotte est une offre distincte à définir avec FOREAS. Ce portail ne fixe pas de tarif collectif et ne cumule pas automatiquement remise de volume et commission.'},
  ],
};

export const fixedRateAnswers:Record<string,string>={
  'Combien puis-je recevoir ?':'5 € par mensualité réellement payée et admissible, ou 50 € une seule fois au premier annuel payé et admissible. Seul l’apporteur direct est rémunéré. Un clic, une inscription, un essai ou une facture nulle ne constitue pas une commission payable.',
  'Quel avantage mon lien donne-t-il au chauffeur ?':'Votre lien partenaire offre 10 % de remise sur son abonnement mensuel ou annuel, puis à chaque renouvellement de cet abonnement. Le prix remisé est confirmé avant le paiement. Votre commission reste de 5 € par mensualité admissible payée ou 50 € au premier annuel admissible.',
};
