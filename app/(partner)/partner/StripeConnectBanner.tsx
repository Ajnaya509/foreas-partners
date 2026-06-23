"use client";

import { useState, useTransition } from "react";
import { getPartnerConnectLink } from "./stripe-actions";
import { Landmark, Loader2, ArrowRight, AlertCircle, Hourglass, ShieldCheck } from "lucide-react";

interface StripeConnectBannerProps {
  connected: boolean;
  pendingCommission: number;
}

function eur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.max(0, n));
}

export function StripeConnectBanner({ connected, pendingCommission }: StripeConnectBannerProps) {
  const [state, setState] = useState<"idle" | "redirecting" | "backend" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // Déjà connecté → pas de bandeau (la home reste épurée, un seul héros).
  if (connected) return null;

  const handleConnect = () => {
    startTransition(async () => {
      const res = await getPartnerConnectLink();
      if (res.ok && res.url) {
        setState("redirecting");
        window.location.href = res.url;
      } else if (res.backendPending) {
        setState("backend");
      } else {
        setErrorMsg(res.error ?? "Erreur inconnue");
        setState("error");
      }
    });
  };

  const hasPending = pendingCommission > 0;

  return (
    <section
      className="relative overflow-hidden rounded-xl border p-xl"
      style={{
        borderColor: "rgba(255,102,153,0.22)",
        background:
          "linear-gradient(135deg, rgba(140,82,255,0.14) 0%, rgba(255,102,153,0.10) 100%)",
      }}
    >
      {/* halo warm diffus */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(255,102,153,0.20), transparent 70%)" }}
      />

      <div className="relative flex flex-col gap-lg md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-md">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #8C52FF 0%, #FF6699 100%)" }}
          >
            <Landmark size={22} />
          </div>
          <div>
            <h2 className="text-h2 font-extrabold text-text-hero">
              Connecte ton compte bancaire pour être payé
            </h2>
            <p className="mt-xxs text-caption text-text-secondary max-w-xl">
              {hasPending ? (
                <>
                  <span className="font-bold text-text-primary">{eur(pendingCommission)}</span> de
                  commissions t&apos;attendent. Tu peux déjà recruter — l&apos;argent est gardé au chaud
                  et versé dès que ton compte est connecté.
                </>
              ) : (
                <>
                  Recrute dès maintenant : tes commissions s&apos;accumulent en sécurité. Connecte ton
                  compte une fois, tu es payé automatiquement chaque mois.
                </>
              )}
            </p>
            <div className="mt-sm flex items-center gap-xs text-micro text-text-muted">
              <ShieldCheck size={12} className="text-success" />
              Paiements sécurisés par Stripe — FOREAS ne voit jamais tes coordonnées bancaires.
            </div>
          </div>
        </div>

        <div className="shrink-0">
          <button
            onClick={handleConnect}
            disabled={isPending || state === "redirecting"}
            className="inline-flex items-center gap-xs rounded-lg px-xl py-md text-body-bold font-extrabold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #8C52FF 0%, #6C3CE0 100%)",
              boxShadow: "0 8px 30px rgba(140,82,255,0.35)",
            }}
          >
            {isPending || state === "redirecting" ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Connexion…
              </>
            ) : (
              <>
                Connecter mon compte <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {state === "backend" && (
        <div className="relative mt-lg flex items-start gap-xs rounded-lg border border-warning/25 bg-warning/10 p-md text-caption text-warning">
          <Hourglass size={16} className="mt-xxs shrink-0" />
          <span>
            La connexion Stripe arrive très bientôt — le service de paiement est en cours
            d&apos;activation. Tes commissions continuent de s&apos;accumuler, rien n&apos;est perdu.
          </span>
        </div>
      )}

      {state === "error" && (
        <div className="relative mt-lg flex items-start gap-xs rounded-lg border border-danger/25 bg-danger/10 p-md text-caption text-danger">
          <AlertCircle size={16} className="mt-xxs shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </section>
  );
}
