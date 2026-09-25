"use server";
import { revalidatePath } from 'next/cache';
import { adminProgramRequest } from '@/lib/partner/admin-program-server';
import { discountSchema,partnerUuid,type DiscountInput } from '@/lib/partner/admin-program';

export async function updatePartnerDiscount(partnerId:string,data:DiscountInput):Promise<void>{
  partnerUuid.parse(partnerId);
  const input=discountSchema.parse(data);
  const raw=await adminProgramRequest(`/api/admin/partners/${partnerId}/discount`,'PATCH',input);
  const result=raw as {ok?:unknown;partner?:Record<string,unknown>};
  if(result?.ok!==true||result.partner?.id!==partnerId)throw new Error('L’enregistrement n’a pas été confirmé. Actualisez le dossier.');
  for(const [key,value] of Object.entries(input))if(result.partner[key]!==value)
    throw new Error('Les réglages retournés diffèrent. Actualisez le dossier avant de recommencer.');
  revalidatePath(`/admin/partners/${partnerId}`);revalidatePath('/admin/partners');
}
export async function updatePartnerStatus(partnerId:string,status:'active'|'paused'):Promise<void>{
  partnerUuid.parse(partnerId);
  if(status!=='active'&&status!=='paused')throw new Error('État invalide.');
  const raw=await adminProgramRequest(`/api/admin/partners/${partnerId}/status`,'PATCH',{status});
  const result=raw as {ok?:unknown;status?:unknown};
  if(result?.ok!==true||result.status!==status)throw new Error('L’admission ou la pause n’a pas été confirmée. Actualisez le dossier.');
  for(const path of [`/admin/partners/${partnerId}`,'/admin/partners','/admin/partner-pending'])revalidatePath(path);
}
