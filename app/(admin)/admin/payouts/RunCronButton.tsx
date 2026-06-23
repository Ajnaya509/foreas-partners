"use client";

import { useState, useTransition } from "react";
import { runCronNow } from "./actions";
import { Play, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { CronResult } from "@/lib/api/railway";

export function RunCronButton() {
  const [result, setResult] = useState<CronResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleRun = () => {
    setResult(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await runCronNow();
        setResult(res);
        setShowDetails(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-md">
      <button
        onClick={handleRun}
        disabled={isPending}
        className="inline-flex items-center gap-xs px-xl py-md rounded-lg border border-warning/30 bg-warning/10 text-warning text-body-bold font-bold hover:bg-warning/20 transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Exécution cron…</>
        ) : (
          <><Play size={16} /> Run cron MLM maintenant</>
        )}
      </button>

      <p className="text-micro text-text-muted text-right">
        ⚠️ Debug seulement — déclenche le versement MLM du mois courant
      </p>

      {error && (
        <div className="w-full flex items-start gap-md p-md rounded-lg bg-danger/10 border border-danger/25 text-danger text-caption">
          <AlertCircle size={16} className="shrink-0 mt-xxs" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="w-full p-md rounded-lg bg-success/10 border border-success/25">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-xs text-success text-body-bold">
              <CheckCircle size={16} />
              Cron exécuté avec succès
            </div>
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="text-caption text-text-tertiary hover:text-text-primary flex items-center gap-xs"
            >
              Détails {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showDetails && (
            <div className="mt-md grid grid-cols-2 sm:grid-cols-3 gap-md">
              {[
                { label: "Mois", value: result.commission_month ?? "—" },
                { label: "Filleuls traités", value: result.qualified_filleuls_processed ?? 0 },
                { label: "Commissions insérées", value: result.commissions_inserted ?? 0 },
                { label: "Transferts réussis", value: result.transfers_succeeded ?? 0 },
                { label: "Transferts échoués", value: result.transfers_failed ?? 0 },
                { label: "Total versé", value: result.total_eur !== undefined ? `${result.total_eur.toFixed(2)} €` : "—" },
              ].map((item) => (
                <div key={item.label} className="p-sm rounded-lg bg-glass-low border border-glass-border">
                  <div className="text-micro uppercase tracking-wider text-text-muted">{item.label}</div>
                  <div className="mt-xxs text-body-bold text-text-primary tabular-nums">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
