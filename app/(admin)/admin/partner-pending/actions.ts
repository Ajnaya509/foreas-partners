"use server";
import {isCurrentUserAdmin} from '@/lib/queries/admin';
import {backendOrigin,partnerSession} from '@/lib/partner/server';
import {parseAdmission,type AdmissionResult} from '@/lib/partner/admission';
import {revalidatePath} from 'next/cache';

function refresh(){for(const path of ['/admin/partner-pending','/admin/partners','/admin/partenaires'])revalidatePath(path);}
async function adminRequest(path:string,method:'POST'|'PATCH',body:object){
  if(!await isCurrentUserAdmin())throw new Error('Accès administrateur requis.');
  const base=backendOrigin(),access=await partnerSession();
  if(!base||!access)throw new Error('Le service d’admission n’est pas disponible.');
  const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  return {status:response.status,body:await response.json()};
}
async function setPartnerStatus(id:string,status:'active'|'paused'):Promise<{ok:boolean;error?:string}>{
  try{
    if(!id||id.length>200)throw new Error();
    const result=await adminRequest(`/api/admin/partners/${encodeURIComponent(id)}/status`,'PATCH',{status});
    if(result.status!==200||result.body?.ok!==true||result.body?.status!==status)throw new Error();
    refresh();return {ok:true};
  }catch{return {ok:false,error:'Le changement n’a pas été confirmé. Actualisez le dossier avant de réessayer.'};}
}
export async function validatePartner(id:string){return setPartnerStatus(id,'active');}
export async function pausePartner(id:string){return setPartnerStatus(id,'paused');}
export type ApproveApplicationResult={ok:true;admission:AdmissionResult}|{ok:false;error:string};
export async function approveApplication(id:string,sendInvitation=false):Promise<ApproveApplicationResult>{
  try{
    if(!id||id.length>200||typeof sendInvitation!=='boolean')throw new Error();
    const result=await adminRequest(`/api/admin/partner-applications/${encodeURIComponent(id)}/approve`,'POST',sendInvitation?{send_invitation:true}:{});
    const admission=parseAdmission(result.status,result.body);
    if(!admission)throw new Error();
    refresh();return {ok:true,admission};
  }catch{return {ok:false,error:'L’admission n’a pas été confirmée. Actualisez le dossier avant de recommencer, surtout si une invitation a été demandée.'};}
}
export async function resendApplicationInvitation(id:string,requestId:string,acknowledge:boolean):Promise<ApproveApplicationResult>{
  try{
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if(!uuid.test(id)||!uuid.test(requestId)||acknowledge!==true)throw new Error();
    const result=await adminRequest(`/api/admin/partner-applications/${encodeURIComponent(id)}/invitation`,'POST',{request_id:requestId,acknowledge_resend:true});
    if(result.status===429)return {ok:false,error:'Attendez quinze minutes après la dernière demande d’envoi.'};
    const admission=parseAdmission(result.status,result.body);
    if(!admission)throw new Error();
    refresh();return {ok:true,admission};
  }catch{return {ok:false,error:'Le nouvel envoi reste à vérifier. Réessayez ici pour retrouver la même demande.'};}
}
export async function rejectApplication(id:string):Promise<{ok:boolean;error?:string}>{
  try{
    if(!id||id.length>200)throw new Error();
    const result=await adminRequest(`/api/admin/partner-applications/${encodeURIComponent(id)}/reject`,'POST',{});
    if(result.status!==200||result.body?.ok!==true||result.body?.status!=='rejected')throw new Error();
    refresh();return {ok:true};
  }catch{return {ok:false,error:'Le refus n’a pas été confirmé. Actualisez le dossier pour vérifier son état.'};}
}
