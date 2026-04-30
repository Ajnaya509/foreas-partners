import { cn } from "@/lib/utils";

interface HeroGradientCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

/**
 * HeroGradientCard — Card hero avec gradient violet/cyan signature FOREAS
 * Utilisé en haut des dashboards pour le "Bonjour [nom]" + actions urgentes
 */
export function HeroGradientCard({ children, className, glow = true }: HeroGradientCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-glass-border-high backdrop-blur-xl",
        "bg-gradient-card",
        "p-xxl",
        glow && "shadow-glow",
        className
      )}
    >
      {/* Gloss overlay subtle */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
