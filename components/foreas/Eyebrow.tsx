import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
  variant?: "violet" | "cyan" | "gold" | "muted";
}

/**
 * Eyebrow — petite étiquette élégante au-dessus des sections
 * (signature visuelle FOREAS, port de l'app mobile)
 *
 * Usage : <Eyebrow>AJNAYA CONCIERGE</Eyebrow>
 */
export function Eyebrow({ children, className, variant = "violet" }: EyebrowProps) {
  const variantClass = {
    violet: "text-violet-royal",
    cyan: "text-cyan-electric",
    gold: "text-gold-radiant",
    muted: "text-text-tertiary",
  }[variant];

  return (
    <span
      className={cn(
        "inline-block text-eyebrow uppercase font-extrabold tracking-[2.5px]",
        variantClass,
        className
      )}
    >
      {children}
    </span>
  );
}
