"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, AlertCircle } from "lucide-react";

/**
 * Copier le lien de parrainage — client component car navigator.clipboard
 * n'existe que dans le navigateur (la page reste un Server Component).
 * Truthful UX : « Copié ! » n'apparaît qu'APRÈS la réussite réelle de
 * l'écriture presse-papiers ; un échec s'affiche, il ne se déguise pas.
 */
export function CopyLinkButton({ link }: { link: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");
  const timerRef = useRef<number | null>(null);

  // Le timer ne doit pas survivre au démontage du bouton.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      // Clipboard refusé (permissions, contexte non sécurisé) : on le dit.
      setState("error");
    }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-xs px-md py-sm rounded-lg bg-violet-royal/15 border border-violet-royal/40 text-violet-royal hover:bg-violet-royal/25 transition-colors"
    >
      {state === "copied" ? (
        <Check size={14} />
      ) : state === "error" ? (
        <AlertCircle size={14} />
      ) : (
        <Copy size={14} />
      )}
      <span className="text-caption font-semibold">
        {state === "copied"
          ? "Copié !"
          : state === "error"
            ? "Copie impossible — sélectionne le lien"
            : "Copier le lien"}
      </span>
    </button>
  );
}
