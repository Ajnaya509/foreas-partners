"use client";

import { cn, getInitials } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ActionChipProps {
  status: "critical" | "warning" | "info";
  driverName?: string;
  driverAvatar?: string;
  context: string;
  cta: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  pulsing?: boolean;
}

/**
 * ActionChip — chip d'action urgente du Hero du Dashboard
 * (signature visuelle Linear-meets-fintech)
 *
 * Pattern : "[Avatar] Nom · contexte court → CTA un-clic"
 * 3 couleurs sémantiques :
 *  - critical (rouge, pulsing) : action immédiate (chauffeur inactif 4 sem)
 *  - warning (orange) : action à faire bientôt (churn 87)
 *  - info (violet) : opportunité positive (nouveau contrat à distribuer)
 */
export function ActionChip({
  status,
  driverName,
  driverAvatar,
  context,
  cta,
  onAction,
  icon,
  pulsing = false,
}: ActionChipProps) {
  const statusStyles = {
    critical: {
      border: "border-danger/40",
      bg: "bg-danger/10",
      glow: "hover:shadow-glow-danger",
      iconBg: "bg-danger/20 text-danger",
      label: "text-danger",
    },
    warning: {
      border: "border-warning/40",
      bg: "bg-warning/10",
      glow: "hover:shadow-[0_0_24px_rgba(245,158,11,0.35)]",
      iconBg: "bg-warning/20 text-warning",
      label: "text-warning",
    },
    info: {
      border: "border-violet-royal/40",
      bg: "bg-violet-royal/10",
      glow: "hover:shadow-glow",
      iconBg: "bg-violet-royal/20 text-violet-royal",
      label: "text-violet-royal",
    },
  }[status];

  return (
    <button
      type="button"
      onClick={onAction}
      className={cn(
        "group relative flex items-center gap-md w-full sm:w-auto sm:min-w-[280px] sm:max-w-[420px]",
        "p-md rounded-xl border backdrop-blur-md transition-all duration-300",
        "text-left animate-fade-in-up",
        statusStyles.border,
        statusStyles.bg,
        statusStyles.glow,
        pulsing && "animate-pulse-violet"
      )}
    >
      {/* Avatar / icon */}
      {icon ? (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            statusStyles.iconBg
          )}
        >
          {icon}
        </div>
      ) : driverName ? (
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-body-bold",
            statusStyles.iconBg
          )}
        >
          {driverAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={driverAvatar} alt={driverName} className="h-full w-full rounded-full object-cover" />
          ) : (
            getInitials(driverName)
          )}
        </div>
      ) : null}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {driverName && (
          <div className="text-body-bold text-text-primary truncate">{driverName}</div>
        )}
        <div className={cn("text-caption truncate", statusStyles.label)}>{context}</div>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-xs shrink-0">
        <span className={cn("text-label font-semibold", statusStyles.label)}>{cta}</span>
        <ChevronRight
          size={16}
          className={cn(statusStyles.label, "transition-transform group-hover:translate-x-1")}
        />
      </div>
    </button>
  );
}
