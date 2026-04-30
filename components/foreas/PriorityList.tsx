"use client";

import { GlassCard } from "./GlassCard";
import { Eyebrow } from "./Eyebrow";
import { cn, getInitials } from "@/lib/utils";
import { ChevronRight, Clock } from "lucide-react";

interface Priority {
  id: string;
  driverName: string;
  context: string;
  cta: string;
  estimatedTime: string;
  severity: "high" | "medium" | "low";
}

const priorities: Priority[] = [
  {
    id: "1",
    driverName: "Mehdi K.",
    context: "CA en chute -35% sur 14 jours",
    cta: "Contacter",
    estimatedTime: "~5 min",
    severity: "high",
  },
  {
    id: "2",
    driverName: "Yann T.",
    context: "0 connexion app depuis 6 jours",
    cta: "Coacher",
    estimatedTime: "~10 min",
    severity: "medium",
  },
  {
    id: "3",
    driverName: "Leila B.",
    context: "Top performer — féliciter",
    cta: "Message",
    estimatedTime: "~2 min",
    severity: "low",
  },
];

const severityStyles = {
  high: { dot: "bg-danger", glow: "shadow-glow-danger" },
  medium: { dot: "bg-warning", glow: "" },
  low: { dot: "bg-success", glow: "" },
};

export function PriorityList() {
  return (
    <GlassCard className="h-full flex flex-col">
      <div className="mb-lg">
        <Eyebrow>Priorités</Eyebrow>
        <h3 className="mt-xxs text-h2 font-bold text-text-hero">
          3 actions à faire aujourd'hui
        </h3>
      </div>

      <div className="flex-1 space-y-md">
        {priorities.map((priority) => {
          const styles = severityStyles[priority.severity];
          return (
            <button
              key={priority.id}
              type="button"
              className={cn(
                "group flex w-full items-center gap-md p-md rounded-lg",
                "bg-glass-low border border-glass-border",
                "hover:bg-glass-high hover:border-violet-royal/30 transition-all",
                "text-left"
              )}
            >
              {/* Avatar with severity dot */}
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-royal font-bold text-white text-body-bold">
                  {getInitials(priority.driverName)}
                </div>
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-obsidian",
                    styles.dot
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-body-bold text-text-primary truncate">
                  {priority.driverName}
                </div>
                <div className="text-caption text-text-secondary truncate">
                  {priority.context}
                </div>
              </div>

              {/* Time + CTA */}
              <div className="flex flex-col items-end shrink-0">
                <span className="flex items-center gap-xxs text-micro text-text-tertiary">
                  <Clock size={10} />
                  {priority.estimatedTime}
                </span>
                <span className="flex items-center gap-xxs mt-xxs text-label font-semibold text-violet-royal">
                  {priority.cta}
                  <ChevronRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}
