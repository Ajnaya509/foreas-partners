/** A driver's public invitation is distinct from professional partner admission. */
export type DriverReferralProfile = {
  id: string; auth_user_id: string; first_name: string | null; last_name: string | null;
  referral_code: string | null; referral_code_new: string | null;
};
export type DriverReferralContext =
  | { status: 'ready'; viewerId: string; profile: DriverReferralProfile }
  | { status: 'unavailable'; code: 'AUTH_REQUIRED' | 'PROFILE_UNAVAILABLE' };
export function driverReferralCode(profile: DriverReferralProfile | null): string | null {
  if (!profile) return null;
  for (const value of [profile.referral_code, profile.referral_code_new]) {
    const code = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (/^[A-Z0-9-]{6,32}$/.test(code) && !['FOREAS', 'FOREAS-NEW'].includes(code)) return code;
  }
  return null;
}
export const driverReferralCopy = {
  title: 'Invite tes collègues chauffeurs',
  intro: 'Partage ton lien personnel pour leur faire découvrir FOREAS Driver.',
  code: 'Ton code de parrainage',
  link: 'Ton lien personnel',
  copy: 'Copier mon lien',
  copying: 'Copie en cours…',
  copied: 'Lien copié.',
  copyError: 'La copie a échoué. Sélectionne le lien pour le copier.',
  whatsapp: 'Préparer un message WhatsApp',
  message: (code: string, link: string) =>
    `Découvre FOREAS Driver avec mon code ${code}.\n\n${link}\n\nSi tu installes l’app, garde ce code pour ton inscription.`,
  messageNote: 'Vérifie le message et choisis tes destinataires avant de l’envoyer.',
  codeNote: 'Ton collègue garde ce code pour son inscription dans l’app. Le passage par la boutique ne garantit pas sa récupération automatique.',
  noCode: 'Ton lien n’est pas disponible.',
  noCodeHelp: 'Actualise la page. Si ton code reste absent, contacte FOREAS.',
  unavailable: 'Ton parrainage est indisponible.',
  unavailableHelp: 'Actualise la page pour retrouver les informations de ton compte.',
  changed: 'Reconnecte-toi pour retrouver ton parrainage.',
  checking: 'Vérification de ton compte…',
  refresh: 'Actualiser mon parrainage',
  login: 'Me reconnecter',
  gains: 'Tes gains de parrainage',
  gainsHelp: 'Ton relevé est indisponible ici pour le moment. Contacte FOREAS pour vérifier tes gains.',
  contact: 'Contacter FOREAS',
  rules: 'La règle de rémunération',
} as const;
