'use client';

export function PrivacyPreferencesLink() {
  return <button type="button" className="partner-privacy-link" onClick={() => window.dispatchEvent(new Event('foreas:privacy-open'))}>Mes choix de confidentialité</button>;
}
