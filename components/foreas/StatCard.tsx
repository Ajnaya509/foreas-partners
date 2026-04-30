"use client";

import { cn, formatEUR, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface StatCardProps {
  label: string;
  value: string | number;
  format?: "raw" | "eur" | "percent";
  trend?: number; // % change vs previous period (signed)
  trendLabel?: string; // "vs hier", "vs mois dernier"
  status?: "success" | "warning" | "danger" | "neutral";
  icon?: React.ReactNode;
  sparkline?: number[]; // mini sparkline data points
  className?: string;
}

/**
 * StatCard — KPI compact card avec trend indicator
 * Port de l'app mobile : value gros, label petit, trend % en haut droite
 */
export function StatCard({
  label,
  value,
  format = "raw",
  trend,
  trendLabel = "vs période préc.",
  status = "neutral",
  icon,
  sparkline,
  className,
}: StatCardProps) {
  const formattedValue =
    format === "eur"
      ? formatEUR(typeof value === "number" ? value : parseFloat(value))
      : format === "percent"
      ? formatPercent(typeof value === "number" ? value : parseFloat(value), { alreadyPercent: true })
      : value;

  const trendIcon =
    trend === undefined ? null : trend > 0 ? (
      <TrendingUp size={14} />
    ) : trend < 0 ? (
      <TrendingDown size={14} />
    ) : (
      <Minus size={14} />
    );

  const trendColor =
    trend === undefined
      ? "text-text-tertiary"
      : (status === "success" && trend > 0) || (status === "danger" && trend < 0) || (status === "neutral" && trend > 0)
      ? "text-success"
      : trend < 0 || (status === "success" && trend < 0) || (status === "danger" && trend > 0)
      ? "text-danger"
      : "text-text-tertiary";

  const iconBgClass = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    neutral: "bg-violet-royal/10 text-violet-royal",
  }[status];

  return (
    <GlassCard className={cn("flex flex-col gap-md", className)}>
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBgClass)}>
            {icon}
          </div>
        )}
        {trend !== undefined && (
          <div className={cn("flex items-center gap-xs text-caption font-bold", trendColor)}>
            {trendIcon}
            <span>{trend > 0 ? "+" : ""}{trend}%</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-display-l font-extrabold text-text-hero">{formattedValue}</div>
        <div className="mt-xs text-caption text-text-secondary">{label}</div>
      </div>

      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-[2px] h-8 mt-xs">
          {sparkline.map((point, i) => {
            const max = Math.max(...sparkline);
            const min = Math.min(...sparkline);
            const range = max - min || 1;
            const height = ((point - min) / range) * 100;
            return (
              <div
                key={i}
                className="flex-1 bg-violet-royal/30 rounded-sm transition-all hover:bg-violet-royal/60"
                style={{ height: `${Math.max(height, 8)}%` }}
              />
            );
          })}
        </div>
      )}

      {trend !== undefined && (
        <div className="text-micro uppercase tracking-wider text-text-muted">{trendLabel}</div>
      )}
    </GlassCard>
  );
}
