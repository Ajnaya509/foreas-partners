import type {Metadata} from 'next';
import {EnrollmentForm} from '@/components/partner-enrollment/EnrollmentForm';
import {termsHash} from '@/lib/partner-enrollment/server';
export const metadata:Metadata={title:'Créer mon espace partenaire · FOREAS',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default function Page(){return <EnrollmentForm termsHash={termsHash()}/>;}
