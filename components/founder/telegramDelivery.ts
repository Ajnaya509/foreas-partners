import type { TelegramDeliveryStatus } from '@/lib/founder/brain/telegramReplies';
export function telegramDeliveryLabel(delivery:TelegramDeliveryStatus|null|undefined):string {
 if(!delivery||delivery.state==='not_queued')return 'Suivi Telegram indisponible pour cette mission.';
 if(delivery.state==='sent')return delivery.matchesCurrentMission?'Réponse Telegram confirmée.':'Ancienne réponse confirmée, mise à jour attendue.';
 return ({pending:'Réponse Telegram à envoyer.',claimed:'Réponse Telegram en préparation.',ready:'Réponse Telegram à envoyer.',dispatching:'Envoi Telegram en cours.',unknown:'Réponse Telegram à vérifier.',rejected:'Envoi Telegram refusé.'})[delivery.state];
}
