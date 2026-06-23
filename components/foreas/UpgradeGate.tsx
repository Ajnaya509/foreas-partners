import { cn } from "@/lib/utils";
import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * UpgradeGate — enveloppe une feature grisée avec bandeau d'upgrade contextuel
 *
 * Pattern PRICING_FEATURES_MASTER §4.2 :
 *   - Feature visible mais inaccessible (opacity + saturate)
 *   - Bandeau FLOTTANT (pas modal) avec phrase d'upgrade concrète (€ ou scène imagée)
 *   - Tap bandeau → page subscribe
 *
 * Usage :
 *   <UpgradeGate
 *     feature="coach"
 *     currentTier={driverTier}
 *     requiredTier="pro"
 *     upgradeText="Cette course Uber rapporte 28€/h. Pro te le dit en 0.3 sec."
 *   >
 *     <CoachCard />
 *   </UpgradeGate>
 */

type Tier = "free" | "pro" | "elite";

const TIER_LEVEL: Record<Tier, number> = { free: 0, pro: 1, elite: 2 };

const UPGRADE_CTA: Record<"pro" | "elite", { label: string; color: string }> = {
  pro: { label: "Débloquer Pro", color: "text-cyan-electric border-cyan-electric/40 bg-cyan-electric/10 hover:bg-cyan-electric/20" },
  elite: { label: "Débloquer Elite", color: "text-gold-radiant border-gold-radiant/40 bg-gold-radiant/10 hover:bg-gold-radiant/20" },
};

interface UpgradeGateProps {
  feature: string;
  currentTier: Tier;
  requiredTier: "pro" | "elite";
  upgradeText: string;
  children: React.ReactNode;
  className?: string;
}

export function UpgradeGate({
  currentTier,
  requiredTier,
  upgradeText,
  children,
  className,
}: UpgradeGateProps) {
  const isLocked = TIER_LEVEL[currentTier] < TIER_LEVEL[requiredTier];

  if (!isLocked) return <>{children}</>;

  const cta = UPGRADE_CTA[requiredTier];

  return (
    <div className={cn("relative", className)}>
      {/* Content grisé */}
      <div
        className="opacity-40 saturate-[0.25] pointer-events-none select-none"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Bandeau flottant — positionné en overlay centré */}
      <Link
        href="/subscribe"
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center",
          "rounded-xl border backdrop-blur-sm",
          "border-white/8 bg-[rgba(0,0,0,0.60)]",
          "group cursor-pointer transition-colors",
          "hover:bg-[rgba(0,0,0,0.70)]"
        )}
      >
        <div className="flex flex-col items-center gap-sm px-md text-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6 border border-white/10">
            <Lock size={16} className="text-text-tertiary group-hover:text-text-secondary transition-colors" />
          </div>
          <p className="text-caption text-text-secondary group-hover:text-text-primary transition-colors max-w-[220px] leading-relaxed">
            {upgradeText}
          </p>
          <span
            className={cn(
              "inline-flex items-center px-md py-xs rounded-lg border text-label font-semibold transition-colors",
              cta.color
            )}
          >
            {cta.label} →
          </span>
        </div>
      </Link>
    </div>
  );
}
