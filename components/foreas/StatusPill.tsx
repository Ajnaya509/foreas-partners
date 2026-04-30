import { cn, getStatusColor, getStatusLabel, type DriverStatus } from "@/lib/utils";

interface StatusPillProps {
  status: DriverStatus;
  label?: string;
  pulsing?: boolean;
  className?: string;
}

/**
 * StatusPill — petite pastille colorée pour statut driver/partner
 * Usage : <StatusPill status="active" /> ou <StatusPill status="alert" pulsing />
 */
export function StatusPill({ status, label, pulsing = false, className }: StatusPillProps) {
  const displayLabel = label ?? getStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-xs px-md py-xs rounded-pill border text-caption font-semibold",
        getStatusColor(status),
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          {
            "bg-success": status === "active",
            "bg-warning": status === "warning" || status === "alert",
            "bg-text-tertiary": status === "inactive",
            "bg-danger": status === "churned",
          },
          pulsing && "animate-pulse-soft"
        )}
      />
      {displayLabel}
    </span>
  );
}
