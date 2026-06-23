"use client";

import { useState, useTransition } from "react";
import { validatePartner, refusePartner } from "./actions";
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle } from "lucide-react";

interface ApproveActionsProps {
  partnerId: string;
  companyName: string;
}

export function ApproveActions({ partnerId, companyName }: ApproveActionsProps) {
  const [status, setStatus] = useState<"idle" | "approved" | "refused" | "error">("idle");
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      try {
        const res = await validatePartner(partnerId);
        setStatus("approved");
        if (res.onboardingUrl) setOnboardingUrl(res.onboardingUrl);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
        setStatus("error");
      }
    });
  };

  const handleRefuse = () => {
    startTransition(async () => {
      try {
        await refusePartner(partnerId);
        setStatus("refused");
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
          {companyName} validé !
        </div>
        {onboardingUrl && (
          <a
            href={onboardingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-xs px-lg py-sm rounded-lg bg-success/10 border border-success/25 text-success text-caption font-bold hover:bg-success/20 transition-colors"
          >
            <ExternalLink size={14} />
            Ouvrir lien Stripe Connect onboarding
          </a>
        )}
      </div>
    );
  }

  if (status === "refused") {
    return (
      <div className="flex items-center gap-xs text-danger text-body-bold">
        <XCircle size={18} />
        {companyName} refusé.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-start gap-xs text-danger text-caption">
        <AlertCircle size={16} className="shrink-0 mt-xxs" />
        <span>{errorMsg}</span>
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
        onClick={handleRefuse}
        disabled={isPending}
        className="inline-flex items-center gap-xs px-lg py-sm rounded-lg bg-danger/10 border border-danger/25 text-danger text-caption font-bold hover:bg-danger/20 transition-colors disabled:opacity-50"
      >
        <XCircle size={14} />
        Refuser
      </button>
    </div>
  );
}
