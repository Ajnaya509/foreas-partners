import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — Tailwind class merger
 * Combine clsx (conditional classes) + tailwind-merge (resolve conflicts)
 * Usage: cn("px-4", { "bg-violet-royal": isActive }, customClass)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatEUR — formatte un montant en euros avec séparateur français
 * formatEUR(3150) → "3 150 €"
 */
export function formatEUR(amount: number, options?: { decimals?: boolean }): string {
  const decimals = options?.decimals ?? false;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(amount);
}

/**
 * formatPercent — formatte un pourcentage avec 1 décimale
 * formatPercent(0.923) → "92,3 %"
 * formatPercent(92.3, { alreadyPercent: true }) → "92,3 %"
 */
export function formatPercent(value: number, options?: { alreadyPercent?: boolean }): string {
  const v = options?.alreadyPercent ? value / 100 : value;
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(v);
}

/**
 * formatDateRelative — date relative en français
 * formatDateRelative(new Date(...)) → "il y a 2h" / "hier" / "il y a 3 jours"
 */
export function formatDateRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH} h`;
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} jours`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Get initials from a full name
 * getInitials("Driss Jacquet") → "DJ"
 */
export function getInitials(name: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Status helper for drivers/partners
 */
export type DriverStatus = "active" | "warning" | "alert" | "inactive" | "churned";

export function getStatusColor(status: DriverStatus): string {
  switch (status) {
    case "active":
      return "text-success border-success/30 bg-success/10";
    case "warning":
      return "text-warning border-warning/30 bg-warning/10";
    case "alert":
      return "text-warning border-warning/30 bg-warning/10";
    case "inactive":
      return "text-text-tertiary border-glass-border bg-glass-low";
    case "churned":
      return "text-danger border-danger/30 bg-danger/10";
    default:
      return "text-text-tertiary border-glass-border bg-glass-low";
  }
}

export function getStatusLabel(status: DriverStatus): string {
  switch (status) {
    case "active":
      return "Actif";
    case "warning":
      return "Vigilance";
    case "alert":
      return "Alerte";
    case "inactive":
      return "Inactif";
    case "churned":
      return "Parti";
    default:
      return "Inconnu";
  }
}
