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

  const endpoint = process.env.AJNAYA_RESPOND_URL;
  if (!endpoint) return { ok: false, backendPending: true };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        canal: "dashboard_driver",
        scope: "driver_only",
        driver_id: user.id,
        message: clean,
        history: history.slice(-10),
      }),
    });
    if (res.status === 404 || res.status === 501) return { ok: false, backendPending: true };
    if (!res.ok) return { ok: false, error: `Ajnaya indisponible (${res.status}).` };

    const data = (await res.json()) as { reply?: string; text?: string; message?: string; handoff_url?: string };
    const reply = data.reply ?? data.text ?? data.message;
    if (!reply) return { ok: false, error: "Réponse vide d'Ajnaya." };
    return { ok: true, reply, handoffUrl: data.handoff_url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur réseau." };
  }
}
