"use client";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/foreas/CommandPalette";
import { Preloader } from "@/components/foreas/Preloader";

export function LegacyChrome() {
  const path = usePathname();
  const paletteAllowed = !(path === "/login" || path.startsWith("/auth/") || path === "/partner" || path.startsWith("/partner/") || path.startsWith("/apercu-partenaire"));
  return <><Preloader />{paletteAllowed && <CommandPalette />}</>;
}
