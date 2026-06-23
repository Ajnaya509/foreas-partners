import { cn } from "@/lib/utils";

interface HeroGradientCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  variant?: "violet" | "cyan" | "warm" | "duo";
}

/**
 * HeroGradientCard — FOREAS Design System v2.0
 * 3 couches: noir apple (#070A14) + halos radiaux + contenu glass
 * variant="violet" (default) → partenaires, home, auth
 * variant="cyan"   → admin data, finance, payouts
 * variant="warm"   → candidatures, CAP partner, communauté
 * variant="duo"    → recruits, performance, driver
 */
export function HeroGradientCard({
  children,
  className,
  glow = false,
  variant = "violet",
}: HeroGradientCardProps) {
  const glowClass =
    variant === "cyan" ? "shadow-glow-cyan" : "shadow-glow";

  // Halo primaire haut-gauche
  const haloTopLeft =
    variant === "cyan"
      ? "rgba(0,212,255,0.22)"
      : variant === "warm"
      ? "rgba(140,82,255,0.22)"
      : "rgba(140,82,255,0.35)";

  // Halo secondaire bas-droite
  const haloBottomRight =
    variant === "cyan"
      ? "rgba(0,212,255,0.30)"
      : variant === "warm"
      ? "rgba(255,102,153,0.28)"
      : "rgba(0,212,255,0.30)";

  // Halo tertiaire haut-droite
  const haloTopRight =
    variant === "cyan"
      ? "rgba(140,82,255,0.18)"
      : variant === "warm"
      ? "rgba(255,102,153,0.20)"
      : "rgba(245,200,66,0.25)";

  // Gloss line top
  const glossTop =
    variant === "cyan"
      ? "rgba(0,212,255,0.60)"
      : variant === "warm"
      ? "rgba(255,102,153,0.50)"
      : "rgba(140,82,255,0.60)";

  // Gloss line bottom
  const glossBottom =
    variant === "cyan"
      ? "rgba(0,212,255,0.30)"
      : variant === "warm"
      ? "rgba(140,82,255,0.25)"
      : "rgba(0,212,255,0.30)";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-glass-border-high backdrop-blur-xl",
        "bg-obsidian-deep/95",
        "p-xxl",
        glow && glowClass,
        className
      )}
    >
      {/* Halo primaire haut-gauche */}
      <div
        className="pointer-events-none absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-50"
        style={{
          background: `radial-gradient(circle, ${haloTopLeft} 0%, transparent 70%)`,
        }}
      />

      {/* Halo secondaire bas-droite */}
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-35"
        style={{
          background: `radial-gradient(circle, ${haloBottomRight} 0%, transparent 70%)`,
        }}
      />

      {/* Halo tertiaire haut-droite */}
      <div
        className="pointer-events-none absolute top-0 right-0 w-48 h-48 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${haloTopRight} 0%, transparent 60%)`,
        }}
      />

      {/* Gloss line top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${glossTop}, transparent)`,
        }}
      />

      {/* Gloss line bottom */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${glossBottom}, transparent)`,
        }}
      />

      <div className="relative">{children}</div>
    </div>
  );
}
