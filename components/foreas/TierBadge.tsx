import { cn } from "@/lib/utils";
import { Crown, Zap } from "lucide-react";

/**
 * TierBadge — badge visuel tier Free/Pro/Elite
 *
 * Design System §4.1 PRICING_FEATURES_MASTER :
 *   Free  : Gris #6B7280    — cercle plein
 *   Pro   : Cyan #00D4FF    — cercle + halo subtil
 *   Elite : Or  #FFD700     — cercle + halo pulsé + 👑
 *
 * Usage : <TierBadge tier="pro" />
 *         <TierBadge tier="elite" size="lg" />
 */

type Tier = "free" | "pro" | "elite";
type Size = "sm" | "md" | "lg";

const TIER_CONFIG: Record<Tier, {
  label: string;
  bg: string;
  text: string;
  border: string;
  shadow: string;
  pulse: boolean;
  icon?: React.ReactNode;
}> = {
  free: {
    label: "Free",
    bg: "bg-[#6B7280]/15",
    text: "text-[#9CA3AF]",
    border: "border-[#6B7280]/30",
    shadow: "",
    pulse: false,
  },
  pro: {
    label: "Pro",
    bg: "bg-cyan-electric/15",
    text: "text-cyan-electric",
    border: "border-cyan-electric/40",
    shadow: "shadow-[0_0_12px_rgba(0,212,255,0.25)]",
    pulse: false,
    icon: <Zap size={10} className="shrink-0" />,
  },
  elite: {
    label: "Elite",
    bg: "bg-gold-radiant/15",
    text: "text-gold-radiant",
    border: "border-gold-radiant/40",
    shadow: "shadow-[0_0_16px_rgba(255,214,89,0.30)]",
    pulse: true,
    icon: <Crown size={10} className="shrink-0" />,
  },
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-xs py-[2px] text-[10px] font-bold tracking-[0.12em] gap-[3px]",
  md: "px-sm py-[3px] text-[11px] font-bold tracking-[0.15em] gap-xs",
  lg: "px-md py-xs text-caption font-bold tracking-[0.15em] gap-xs",
};

interface TierBadgeProps {
  tier: Tier;
  size?: Size;
  className?: string;
}

export function TierBadge({ tier, size = "md", className }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border uppercase",
        config.bg,
        config.text,
        config.border,
        config.shadow,
        config.pulse && "animate-pulse-violet",
        SIZE_CLASSES[size],
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
