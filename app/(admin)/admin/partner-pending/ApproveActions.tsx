"use client";

import { useState, useTransition } from "react";
import { validatePartner, pausePartner } from "./actions";
import { CheckCircle, PauseCircle, Loader2, AlertCircle } from "lucide-react";

interface ApproveActionsProps {
  partnerId: string;
  companyName: string;
}

export function ApproveActions({ partnerId, companyName }: ApproveActionsProps) {
  const [status, setStatus] = useState<"idle" | "approved" | "paused" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // Truthful UX : le message vert n'apparaît qu'après un update RÉEL en base
  // (res.ok) — un échec RLS ou un id inconnu s'affiche en erreur, pas en succès.
  const handleApprove = () => {
    startTransition(async () => {
      try {
        const res = await validatePartner(partnerId);
        if (res.ok) {
          setStatus("approved");
        } else {
          setErrorMsg(res.error ?? "Erreur inconnue");
          setStatus("error");
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
        setStatus("error");
      }
    });
  };

  const handlePause = () => {
    startTransition(async () => {
      try {
        const res = await pausePartner(partnerId);
        if (res.ok) {
          setStatus("paused");
        } else {
          setErrorMsg(res.error ?? "Erreur inconnue");
          setStatus("error");
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
        setStatus("error");
      }
    });
  };

  if (status === "approved") {
    return (
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-xs text-success text-body-bold">
          <CheckCircle size={18} />
          {companyName} validé — statut actif.
        </div>
        <p className="text-caption text-text-tertiary">
          Le partenaire génère son lien Stripe Connect depuis son espace.
        </p>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="flex items-center gap-xs text-danger text-body-bold">
        <PauseCircle size={18} />
        {companyName} mis en pause.
      </div>
    );
  }

  if (status === "error") {
    // Un échec ne doit pas être un cul-de-sac : on remet les boutons en jeu.
    return (
      <div className="flex flex-col gap-sm">
        <div className="flex items-start gap-xs text-danger text-caption">
          <AlertCircle size={16} className="shrink-0 mt-xxs" />
          <span>{errorMsg}</span>
        </div>
        <button
          onClick={() => { setErrorMsg(""); setStatus("idle"); }}
          className="self-start px-md py-xxs rounded-lg border border-glass-border text-caption font-bold text-text-secondary hover:text-text-primary transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-sm">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="inline-flex items-center gap-xs px-lg py-sm rounded-lg bg-success/10 border border-success/25 text-success text-caption font-bold hover:bg-success/20 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <CheckCircle size={14} />
        )}
        Valider
      </button>
      <button
        onClick={handlePause}
        disabled={isPending}
        className="inline-flex items-center gap-xs px-lg py-sm rounded-lg bg-danger/10 border border-danger/25 text-danger text-caption font-bold hover:bg-danger/20 transition-colors disabled:opacity-50"
      >
        <PauseCircle size={14} />
        Mettre en pause
      </button>
    </div>
  );
}
