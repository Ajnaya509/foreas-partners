"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * PORTE AJNAYA (espace chauffeur du dashboard web).
 *
 * Cette action NE contient AUCUNE logique IA. Elle se contente de transmettre la
 * demande du chauffeur au **Responder Pieuvre canonique** (DG_ORCHESTRATEUR), via
 * l'URL contractée `AJNAYA_RESPOND_URL`. Règle FOREAS-SHARED : jamais d'endpoint
 * Ajnaya parallèle, une seule entité, une seule voix (Koraly), mémoire `canal_memory`.
 *
 * Canal : "dashboard_driver". Scope : "driver_only" (la Pieuvre refuse tout ce qui
 * ne concerne pas les courses / gains / activité du chauffeur).
 *
 * Tant que le fil Pieuvre n'a pas branché l'URL, l'action renvoie backendPending
 * proprement (pas de crash, message d'attente côté UI).
 */

export type AjnayaTurn = { role: "driver" | "ajnaya"; content: string };

export type AskAjnayaResult = {
  ok: boolean;
  reply?: string;
  handoffUrl?: string;
  backendPending?: boolean;
  error?: string;
};

export async function askAjnaya(message: string, history: AjnayaTurn[] = []): Promise<AskAjnayaResult> {
  const clean = message.trim();
  if (!clean) return { ok: false, error: "Message vide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Session expirée — reconnecte-toi." };

  // Contrat canonique Pieuvre (changelog 22:35) : POST webhook ajnaya-respond,
  // header x-foreas-shared-secret, payload {tentacle, canal, session_id, identity_id?,
  // message:{text}, context:{history_last_10}}, réponse reply.text.
  const endpoint =
    process.env.AJNAYA_RESPOND_URL ?? "https://n8n.srv1534739.hstgr.cloud/webhook/ajnaya-respond";
  const secret = process.env.PIEUVRE_WEBHOOK_SECRET;
  // Sans secret partagé → le webhook renvoie 401 d'office : on signale proprement.
  if (!secret) return { ok: false, backendPending: true };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-foreas-shared-secret": secret },
      cache: "no-store",
      body: JSON.stringify({
        tentacle: "dashboard_driver",
        canal: "dashboard_driver",
        session_id: user.id,
        identity_id: user.id,
        message: { text: clean },
        context: { history_last_10: history.slice(-10) },
      }),
    });
    if (res.status === 404 || res.status === 501) return { ok: false, backendPending: true };
    if (res.status === 401)
      return { ok: false, error: "Ajnaya : secret partagé manquant/invalide (PIEUVRE_WEBHOOK_SECRET sur Vercel)." };
    if (!res.ok) return { ok: false, error: `Ajnaya indisponible (${res.status}).` };

    const data = (await res.json()) as {
      reply?: { text?: string; handoff_url?: string } | string;
      text?: string;
      handoff_url?: string;
    };
    const reply = typeof data.reply === "object" ? data.reply?.text : (data.reply ?? data.text);
    const handoffUrl =
      (typeof data.reply === "object" ? data.reply?.handoff_url : undefined) ?? data.handoff_url;
    if (!reply) return { ok: false, error: "Réponse vide d'Ajnaya." };
    return { ok: true, reply, handoffUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau." };
  }
}
