"use client";

import { useState, useTransition } from "react";
import { updatePartnerDiscount } from "./actions";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface DiscountFormProps {
  partnerId: string;
  initialDiscount: number;
  initialDuration: number;
  initialMessage: string;
  initialHeroUrl: string;
  initialPromoActive: boolean;
}

const DURATION_OPTIONS = [1, 3, 6, 12] as const;

export function DiscountForm({
  partnerId,
  initialDiscount,
  initialDuration,
  initialMessage,
  initialHeroUrl,
  initialPromoActive,
}: DiscountFormProps) {
  const [discount, setDiscount] = useState(initialDiscount);
  const [duration, setDuration] = useState<number>(initialDuration);
  const [message, setMessage] = useState(initialMessage);
  const [heroUrl, setHeroUrl] = useState(initialHeroUrl);
  const [promoActive, setPromoActive] = useState(initialPromoActive);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      try {
        await updatePartnerDiscount(partnerId, {
          discount_percent_for_recruits: discount,
          discount_duration_months: duration,
          landing_message: message,
          landing_hero_url: heroUrl,
          is_promo_active: promoActive,
        });
        setStatus("ok");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Erreur inconnue");
        setStatus("error");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-lg">
      {/* Toggle promo active */}
      <div className="flex items-center justify-between p-md rounded-lg bg-glass-low border border-glass-border">
        <div>
          <div className="text-body-bold text-text-primary">Promo active</div>
          <div className="text-caption text-text-tertiary">
            Active le code promo sur la page /cap?ref={"{code}"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPromoActive((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            promoActive ? "bg-cyan-electric" : "bg-glass-border"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              promoActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Slider discount % */}
      <div>
        <div className="flex justify-between items-center mb-sm">
          <label className="text-body-bold text-text-primary">
            Remise filleuls
          </label>
          <span className="text-display-l font-extrabold text-cyan-electric tabular-nums">
            {discount}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #00D4FF ${discount * 2}%, rgba(255,255,255,0.12) ${discount * 2}%)`,
          }}
        />
        <div className="flex justify-between text-micro text-text-muted mt-xs">
          <span>0%</span><span>25%</span><span>50%</span>
        </div>
      </div>

      {/* Durée remise */}
      <div>
        <label className="text-body-bold text-text-primary block mb-sm">
          Durée de la remise
        </label>
        <div className="grid grid-cols-4 gap-sm">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`py-sm rounded-lg text-body-bold transition-colors ${
                duration === d
                  ? "bg-cyan-electric text-obsidian-deep"
                  : "bg-glass-low border border-glass-border text-text-secondary hover:bg-glass-high"
              }`}
            >
              {d} mois
            </button>
          ))}
        </div>
      </div>

      {/* Landing message */}
      <div>
        <label className="text-body-bold text-text-primary block mb-sm">
          Message page partenaire
          <span className="ml-xs text-caption text-text-muted font-normal">(optionnel)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex : Rejoins la flotte FOREAS recommandée par Auto-École Léo et bénéficie de 20% pendant 3 mois !"
          rows={3}
          className="w-full px-md py-sm rounded-lg bg-glass-low border border-glass-border text-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 resize-none transition-colors"
        />
      </div>

      {/* Hero URL */}
      <div>
        <label className="text-body-bold text-text-primary block mb-sm">
          URL image hero
          <span className="ml-xs text-caption text-text-muted font-normal">(optionnel)</span>
        </label>
        <input
          type="url"
          value={heroUrl}
          onChange={(e) => setHeroUrl(e.target.value)}
          placeholder="https://..."
          className="w-full px-md py-sm rounded-lg bg-glass-low border border-glass-border text-body text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-electric/50 transition-colors"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-md pt-xs">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-xs px-xl py-md rounded-lg font-bold text-body-bold text-obsidian-deep disabled:opacity-50 transition-all"
          style={{ background: "linear-gradient(135deg, #00D4FF 0%, #6DEAFF 100%)" }}
        >
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Enregistrement…</>
          ) : (
            "Enregistrer les modifications"
          )}
        </button>

        {status === "ok" && (
          <div className="flex items-center gap-xs text-success text-caption font-bold">
            <CheckCircle size={16} /> Sauvegardé
          </div>
        )}
        {status === "error" && (
          <div className="flex items-center gap-xs text-danger text-caption font-bold">
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}
      </div>
    </form>
  );
}
