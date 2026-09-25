import Link from 'next/link';
export function EnrollmentFrame({children}:{children:React.ReactNode}){
  return <div className="enrollment-shell"><a className="enrollment-skip" href="#enrollment-main">Aller au contenu</a><header className="enrollment-header"><Link href="https://www.foreas.xyz" aria-label="FOREAS, accueil"><img src="/logo-full.svg" alt="FOREAS" width="160" height="32"/></Link><a href="mailto:contact@foreas.xyz">Besoin d’aide ?</a></header><main id="enrollment-main" className="enrollment-main">{children}</main><footer className="enrollment-footer"><span>© 2026 FOREAS. Tous droits réservés.</span><a href="https://www.foreas.xyz/confidentialite">Confidentialité</a><a href="mailto:contact@foreas.xyz">Contact</a></footer></div>;
}
