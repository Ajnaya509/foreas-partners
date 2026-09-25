import {ConfirmEmail} from '@/components/partner-enrollment/ConfirmEmail';
export const metadata={title:'Confirmer mon email · FOREAS',robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function Page({searchParams}:{searchParams:Promise<{h?:string;t?:string}>}){const p=await searchParams;return <ConfirmEmail hash={p.h||''} type={p.t||''}/>;}
