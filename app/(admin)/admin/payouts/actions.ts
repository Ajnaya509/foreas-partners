"use server";
/** Kept only to reject an old client. It cannot invoke any payment service. */
export async function runCronNow():Promise<never>{
 throw new Error('Cette ancienne commande est retirée. Aucun versement n’a été déclenché.');
}
