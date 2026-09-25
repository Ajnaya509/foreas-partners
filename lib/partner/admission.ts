import {z} from 'zod';
const admissionSchema=z.object({ok:z.boolean(),partner_id:z.string().min(1),referral_code:z.string().nullable(),admission:z.object({state:z.enum(['awaiting_identity','active']),invitation:z.enum(['not_requested','sent','uncertain','failed'])})});
export function parseAdmission(status:number,value:unknown){
  const result=admissionSchema.safeParse(value);
  if(!result.success)return null;
  const data=result.data;
  if(status===202&&data.admission.state==='awaiting_identity')return data;
  if(status===200&&data.ok&&data.admission.state==='active')return data;
  return null;
}
export type AdmissionResult=NonNullable<ReturnType<typeof parseAdmission>>;
export const invitationLabels={not_requested:'Aucune invitation par courriel demandée.',sent:'L’invitation a été acceptée par le service d’envoi. Son ouverture reste à confirmer.',uncertain:'L’envoi de l’invitation reste à vérifier. Contrôlez le dossier avant un nouvel envoi.',failed:'L’envoi de l’invitation n’a pas abouti.'};
