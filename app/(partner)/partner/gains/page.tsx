import {PartnerScreen} from '@/components/partner/Screen';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{cursor?:string|string[]}>}){
  const {cursor}=await searchParams;
  return <PartnerScreen section="gains" cursor={typeof cursor==='string'?cursor:null}/>;
}
