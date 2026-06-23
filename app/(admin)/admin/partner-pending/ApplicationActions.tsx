"use client";

import { useState, useTransition } from "react";
import { approveApplication, rejectApplication } from "./actions";
import { CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle, Hourglass, Copy } from "lucide-react";

interface ApplicationActionsProps {
  applicationId: string;
  companyName: string;
}

export function ApplicationActions({ applicationId, companyName }: ApplicationActionsProps) {
  const [status, setStatus] = useState<"idle" | "approved" | "refused" | "error" | "backend">("idle");
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleApprove = () => {
    startTransition(async () => {
      try {
        const res = await approveApplication(applicationId);
        if (res.ok) {
          setStatus("approved");
          setOnboardingUrl(res.onboardingUrl ?? null);
          setReferralCode(res.referralCode ?? null);
        } else if (res.backendPending) {
          setStatus("backend");
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

  const handleRefuse = () => {
    startTransition(async () => {
      try {
        const res = await rejectApplication(applicationId);
        if (res.ok) setStatus("refused");
        else {
          setErrorMsg(res.error ?? "Erreur inconnue");
          setStatus("error");
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue");
        setStatus("error");
      }
    });
  };

  const copyLink = (code: string) => {
    navigator.clipboard?.writeText(`https://foreas.xyz/cap?ref=${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (status === "approved") {
    return (
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-xs text-success text-body-bold">
          <CheckCircle size={18} />
          {companyName} validé — compte créé, invitation envoyée.
        </div>
        {referralCode && (
          <button
            onClick={() => copyLink(referralCode)}
            className="inline-flex items-center gap-xs px-lg py-sm rounded-lg bg-glass-low border border-glass-border text-text-secondary text-caption font-bold hover:bg-glass-high transition-colors"
          >
            <Copy size={14} />
            {copied ? "Lien copié !" : `Copier foreas.xyz/cap?ref=${referralCode}`}
          </button>
        )}
        {onboardingUrl && (
          <a
            href={onboardingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-xs px-lg py-sm rounded-lg bg-success/10 border border-success/25 text-success text-caption font-bold hover:bg-success/20 transition-colors"
          >
            <ExternalLink size={14} />
            Lien Stripe Connect onboarding
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

  if (status === "backend") {
    return (
      <div className="flex items-start gap-xs text-warning text-caption">
        <Hourglass size={16} className="shrink-0 mt-xxs" />
        <span>
          <strong>Approbation en attente du backend</strong> — l&apos;endpoint Railway
          d&apos;approbation des candidatures (<code className="font-mono">/api/admin/partner-applications/:id/approve</code>)
          n&apos;est pas encore livré. La candidature reste en attente, rien n&apos;est perdu.
        </span>
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
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
        Valider & inviter
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
