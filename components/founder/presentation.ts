import type { GatewayMissionView } from '@/lib/founder/brain/gateway';
import { isMissionControlCapability,missionControlResult } from './missionControlResult';
export const administration=[
 ['overview','Vue d’ensemble'],['acquisition','Acquisition'],['chauffeurs','Chauffeurs'],['partners','Partenaires'],['partner-pending','Candidatures'],['payouts','Versements partenaires'],['partenaires','Ancien espace partenaires'],['finance','Finance'],['pieuvre','Pieuvre et IA'],['communaute','Communauté'],['moderation','Modération'],['stack','Fonctionnement des services'],['securite','Sécurité'],['reports','Rapports et exports']
];
export const capabilityLabel:Record<string,string>={
 'social.metrics.read':'Lire le registre du robot social','mission.control':'Contrôler une mission','mission.status.read':'Suivre une mission',
 'stripe.payout.prepare':'Préparer un versement bancaire','stripe.payout.create':'Versement bancaire avec accord','stripe.payout.execute_prepared':'Versement bancaire avec accord',
 'code.change.prepare':'Préparer une correction à relire','code.worker.status.read':'Suivre le service de correction','stripe.balance.read':'Lire le solde Stripe','n8n.workflow.read':'Lire l’état du robot','n8n.workflow.deactivation.prepare':'Préparer l’arrêt du robot','n8n.workflow.deactivate':'Arrêter les prochains déclenchements','content.video.draft':'Préparer le déroulé de la vidéo'
};
export const record=(v:unknown):v is import('@/lib/founder/brain/types').JsonObject=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const dateLabel=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('fr-FR',{dateStyle:'short',timeStyle:'medium'}).format(new Date(v)):'Date non confirmée';
export function missionLabel(m:GatewayMissionView):string{
 if(m.steps.some(s=>s.status==='uncertain'))return 'Résultat à vérifier';
 if(m.control==='cancel')return m.steps.some(s=>s.status==='executing')?'Annulation demandée':'Annulée';
 if(m.control==='pause')return 'En pause';
 if(m.status==='succeeded'&&m.steps.length&&m.steps.every(s=>isMissionControlCapability(s.capability))){
  if(m.steps.some(s=>!missionControlResult(s,m.id)))return 'Résultat indisponible';
  return m.steps.every(s=>s.capability==='mission.status.read')?'État relu':m.steps.every(s=>s.capability==='mission.control')?'Commande enregistrée':'Demandes traitées';
 }
 if(m.status==='succeeded')return m.steps.some(s=>record(s.result)&&Array.isArray(s.result.evidence)&&s.result.evidence.some(e=>record(e)&&e.kind==='draft'))?'Préparé · À relire':'Étapes terminées';
 if(m.status==='failed')return 'Échec';
 if(m.status==='running')return 'En cours';
 if(m.status==='waiting'){
  const needs=m.steps.flatMap(s=>Array.isArray(s.needs)?s.needs:[]).filter(record);
  if(needs.some(n=>n.kind==='approval'))return 'Accord nécessaire';
  if(needs.some(n=>n.kind==='access'))return 'Accès manquant';
  if(needs.some(n=>n.kind==='capability'))return 'Fonction indisponible';
  return 'Vérification nécessaire';
 }
 return m.status==='cancelled'?'Annulée':'Mission enregistrée';
}
