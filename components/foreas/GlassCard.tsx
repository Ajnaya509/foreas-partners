import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "low" | "highlight";
  children: React.ReactNode;
}

/**
 * GlassCard — card de base FOREAS, glass-morphism dark
 * (port pixel-perfect de l'app mobile)
 *
 * Variants :
 *  - default : glass-high (cards principales)
 *  - elevated : glass-high + border + shadow (cards prioritaires)
 *  - low : glass-low (cards secondaires)
 *  - highlight : gradient violet/cyan subtle (CTA / hero)
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, variant = "default", className, ...props }, ref) => {
    const variantClass = {
      default: "glass-card",
      elevated: "glass-card-elevated",
      low: "glass-card-low",
      highlight: "glass-card bg-gradient-card",
    }[variant];

    return (
      <div ref={ref} className={cn(variantClass, "p-xl", className)} {...props}>
        {children}
      </div>
    );
  }
);

GlassCard.displayName = "GlassCard";
