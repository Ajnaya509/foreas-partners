import 'server-only';
import { isCurrentUserAdmin } from '@/lib/queries/admin';
import { backendOrigin, partnerSession, partnerGet } from './server';
import { adminPartnerSchema, adminPartnerListSchema, adminRightsSchema, rightsQueryString, type RightsQuery } from './admin-program';

/** The backend repeats the active administrator and second-factor checks. */
export async function adminProgramRequest(path:string,method:'GET'|'PATCH',body?:object){
  if(!await isCurrentUserAdmin())throw new Error('Accès administrateur vérifié requis.');
  const origin=backendOrigin(),session=await partnerSession();
  if(!origin||!session)throw new Error('Le service est indisponible.');
  const response=await fetch(origin+path,{method,headers:{Authorization:`Bearer ${session}`,'Content-Type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data:unknown=await response.json();
  if(!response.ok)throw new Error('Le serveur n’a pas confirmé cette demande.');
  return data;
}
export async function getAdminPartner(id:string){
  const response=await adminProgramRequest(`/api/admin/partners/${encodeURIComponent(id)}`,'GET');
  const partner=adminPartnerSchema.parse((response as {partner?:unknown})?.partner);
  if(partner.id!==id)throw new Error('Le dossier reçu ne correspond pas au partenaire.');
  return partner;
}
export async function getAdminRights(query:RightsQuery){
  const queryString=rightsQueryString(query);
  if(!await isCurrentUserAdmin())return {status:'unavailable',code:'ADMIN_REQUIRED'} as const;
  return partnerGet(`/api/admin/partner-finance/rights?${queryString}`,adminRightsSchema);
}

/** No completeness or server pagination metadata is supplied by this legacy profile read. */
export async function getAdminPartners(){
  const response=await adminProgramRequest('/api/admin/partners','GET');
  return adminPartnerListSchema.parse(response).partners;
}
