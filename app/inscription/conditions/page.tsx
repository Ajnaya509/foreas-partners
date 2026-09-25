import Link from 'next/link';
import {TERMS} from '@/lib/partner-enrollment/policy';
import {EnrollmentFrame} from '@/components/partner-enrollment/EnrollmentFrame';
export const metadata={title:'Conditions du programme partenaire · FOREAS',robots:{index:false,follow:false}};
export default function Page(){return <EnrollmentFrame><article className="enrollment-card enrollment-legal"><Link href="/inscription" className="enrollment-back">Retour à mon inscription</Link><h1>Les conditions du programme.</h1><div className="enrollment-terms-full">{TERMS}</div><a href="mailto:contact@foreas.xyz" className="enrollment-secondary">Une question sur ces conditions ?</a></article></EnrollmentFrame>;}
