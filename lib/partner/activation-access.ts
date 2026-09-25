import type {PartnerKit,PartnerMe} from './contract';
export type ActivationResource={filename:string;id:string;title:string;description:string;format:'pdf'|'zip';version:string;sha256:string;bytes:number};
/** A file on disk is not a publication or a partner's right to share it. */
export function activationAccess(resource:ActivationResource,me:PartnerMe,kit:PartnerKit):boolean {
  if(me.admission.state!=='active'||!me.capabilities.can_recruit||!me.terms.required_version||me.terms.acceptance_required||me.terms.accepted_version!==me.terms.required_version||kit.availability!=='available')return false;
  return kit.items.some(item=>{
    if(item.id!==resource.id||item.version!==resource.version||item.format!==resource.format)return false;
    try{const u=new URL(item.url);return u.origin==='https://partners.foreas.xyz'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname===`/partner/ressources/${resource.filename}`;}catch{return false;}
  });
}
export function activationFilename(value:string):boolean{return /^[A-Z0-9_]+\.(pdf|zip)$/.test(value);}
