"use client";

import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { cn } from "@/lib/utils";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/partner";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : authError.message);
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Une erreur est survenue. Réessaie dans quelques instants.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-lg">
      {/* Ambient glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-violet-royal/20 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] rounded-full bg-cyan-electric/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        {/* Logo + tagline */}
        <div className="text-center mb-xxl">
          <div className="inline-flex items-baseline gap-xs">
            <span className="text-display-xl font-extrabold text-text-hero tracking-tight">FOREAS</span>
            <span className="text-h1 font-light text-violet-royal">/</span>
          </div>
          <div className="mt-xs">
            <Eyebrow>Espace Directeur · Coopérative VTC</Eyebrow>
          </div>
        </div>

        {/* Login card */}
        <GlassCard variant="elevated" className="!p-xxl">
          <div className="mb-lg">
            <h1 className="text-h1 font-bold text-text-hero">Connexion</h1>
            <p className="mt-xs text-body text-text-secondary">
              Accède à ton dashboard et tes commissions.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-lg">
            <div>
              <label className="block text-label text-text-secondary mb-xs">Email</label>
              <input
                type="email"
                placeholder="prenom.nom@exemple.com"
                required
                autoFocus
                className={cn(
                  "w-full px-md py-md rounded-lg",
                  "bg-glass-low border border-glass-border",
                  "text-body-lg text-text-primary placeholder:text-text-tertiary",
                  "focus:outline-none focus:ring-2 focus:ring-violet-royal/50 focus:border-violet-royal/50",
                  "transition-all"
                )}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-label text-text-secondary mb-xs">Mot de passe</label>
              <input
                type="password"
                placeholder="••••••••"
                required
                className={cn(
                  "w-full px-md py-md rounded-lg",
                  "bg-glass-low border border-glass-border",
                  "text-body-lg text-text-primary placeholder:text-text-tertiary",
                  "focus:outline-none focus:ring-2 focus:ring-violet-royal/50 focus:border-violet-royal/50",
                  "transition-all"
                )}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-start gap-sm p-md rounded-lg bg-danger/10 border border-danger/30 text-caption text-danger">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "group w-full flex items-center justify-center gap-sm",
                "px-lg py-md rounded-lg",
                "bg-gradient-royal text-white text-body-bold font-bold",
                "transition-all hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed",
                !loading && "halo-pulse"
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                <>
                  Se connecter
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-xl pt-xl border-t border-glass-border text-center">
            <p className="text-caption text-text-tertiary">
              Pas encore directeur de groupe ?{" "}
              <a
                href="https://foreas.xyz/devenir-partenaire"
                className="text-violet-royal font-semibold hover:text-cyan-electric transition-colors"
              >
                Rejoindre FOREAS
              </a>
            </p>
          </div>
        </GlassCard>

        <p className="mt-xl text-center text-micro text-text-muted uppercase tracking-wider">
          Coopérative d'Activité et d'Emploi · CAE VTC-T3P · 100% légal
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-violet-royal" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
