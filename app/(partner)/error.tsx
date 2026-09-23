"use client";
import Link from 'next/link';
export default function ErrorPage({reset}:{error:Error;reset:()=>void}){return <div className="partner-shell"><main id="partner-content" className="partner-main"><h1>Votre espace n’a pas pu être chargé.</h1><p className="mt-lg">Vos informations ne sont pas remplacées par une estimation. Réessayez pour retrouver votre dossier.</p><button className="partner-button" onClick={reset}>Réessayer</button><Link href="/partner/aide" className="partner-text-link ml-lg">Consulter l’aide</Link></main></div>;}
