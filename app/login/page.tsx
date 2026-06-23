"use client";

import { useState, Suspense, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Mail,
  Lock,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Eyebrow } from "@/components/foreas/Eyebrow";
import { ForeasLogo } from "@/components/foreas/ForeasLogo";
import { ForeasDivider } from "@/components/foreas/ForeasDivider";
import { cn } from "@/lib/utils";

type LoginMode = "password" | "magic";
type AuthRole = "admin" | "partner" | "driver" | null;

const ROLE_CONFIG = {
  admin: {
    eyebrow: "Console Admin · Accès restreint",
    headline: "Ton infrastructure,\nton contrôle.",
    subtitle: "Tableau de bord DG · FOREAS Holding.",
    badge: "Admin",
    badgeColor: "bg-danger/10 text-danger border-danger/30",
  },
  partner: {
    eyebrow: "Espace Directeur · Coopérative VTC",
    headline: "Ta flotte\nt'attend.",
    subtitle: "Accède à tes commissions, tes chauffeurs, tes KPIs.",
    badge: "Directeur",
    badgeColor: "bg-violet-royal/10 text-violet-royal border-violet-royal/30",
  },
  driver: {
    eyebrow: "Espace Chauffeur · Données privées",
    headline: "Tes données,\nton pilotage.",
    subtitle: "Ajnaya analyse. Toi, tu choisis.",
    badge: "Chauffeur",
    badgeColor: "bg-cyan-electric/10 text-cyan-electric border-cyan-electric/30",
  },
  default: {
    eyebrow: "Espace Partenaires · FOREAS",
    headline: "Accède à\nton dashboard.",
    subtitle: "Commissions, flotte, analytics — tout ici.",
    badge: null,
    badgeColor: "",
  },
};

async function getSmartRedirect(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  next: string
): Promise<string> {
  // If next explicitly targets a portal, trust it
  if (next.startsWith("/admin")) return "/admin";
  if (next.startsWith("/partner")) return "/partner";
  if (next.startsWith("/driver")) return "/driver";

  // Check admin role
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (adminRole) return "/admin";

  // Check partner
  const { data: partner } = await supabase
    .from("partners")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (partner) return "/partner";

  // Check driver
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (driver) return "/driver";

  // Fallback
  return next.startsWith("/") ? next : "/partner";
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<LoginMode>("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/partner";
  const roleParam = searchParams.get("role") as AuthRole;
  const errorParam = searchParams.get("error");

  const config = roleParam
    ? ROLE_CONFIG[roleParam] ?? ROLE_CONFIG.default
    : ROLE_CONFIG.default;

  useEffect(() => {
    if (errorParam === "access_denied") {
      setError("Accès refusé. Ce compte n'a pas les permissions requises pour cette section.");
    }
  }, [errorParam]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid login credentials"
            ? "Email ou mot de passe incorrect."
            : authError.message === "Email not confirmed"
            ? "Confirme ton adresse email avant de te connecter."
            : "Une erreur est survenue. Réessaie."
        );
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Authentification échouée. Réessaie.");
        setLoading(false);
        return;
      }

      const redirect = await getSmartRedirect(supabase, user.id, next);
      router.push(redirect);
      router.refresh();
    } catch {
      setError("Une erreur réseau est survenue. Vérifie ta connexion.");
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Entre ton email pour recevoir le lien.");
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        },
      });

      if (otpError) {
        setError(otpError.message);
        setLoading(false);
        return;
      }

      setMagicSent(true);
    } catch {
      setError("Envoi impossible. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = cn(
    "w-full px-md py-[14px] rounded-xl",
    "bg-white/[0.04] border border-white/[0.08]",
    "text-base text-text-primary placeholder:text-text-tertiary",
    "focus:outline-none focus:border-violet-royal/60 focus:bg-white/[0.06]",
    "transition-all duration-200"
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-lg bg-[#000000]">
      {/* Ambient halos — variant violet */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full bg-violet-royal/[0.15] blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-cyan-electric/[0.08] blur-[140px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4wMTIiLz48L3N2Zz4=')] opacity-100" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[420px]"
      >
        {/* Logo header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mb-4"
          >
            <ForeasLogo variant="full" color="#F8FAFC" height={36} />
          </motion.div>
          <ForeasDivider className="mx-auto max-w-[180px]" opacity={0.5} />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mt-4 flex items-center justify-center gap-3"
          >
            <Eyebrow>{config.eyebrow}</Eyebrow>
            {config.badge && (
              <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider uppercase", config.badgeColor)}>
                {config.badge}
              </span>
            )}
          </motion.div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl overflow-hidden">
          {/* Card inner */}
          <div className="p-8">
            {/* Headline */}
            <div className="mb-7">
              <h1 className="text-[28px] font-extrabold text-text-hero leading-tight tracking-tight whitespace-pre-line">
                {config.headline}
              </h1>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                {config.subtitle}
              </p>
            </div>

            {/* Error state */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-danger/[0.08] border border-danger/25 text-[13px] text-danger">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Access denied state */}
            <AnimatePresence>
              {errorParam === "access_denied" && !error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 flex items-start gap-3 p-3 rounded-xl bg-warning/[0.08] border border-warning/25 text-[13px] text-warning"
                >
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>Ce compte n&apos;a pas accès à cette section. Reconnecte-toi.</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Magic link sent state */}
            <AnimatePresence mode="wait">
              {magicSent ? (
                <motion.div
                  key="magic-sent"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center py-6"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 border border-success/20 mx-auto mb-4">
                    <Mail size={24} className="text-success" />
                  </div>
                  <h3 className="text-base font-bold text-text-hero">Lien envoyé</h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    Check <span className="text-text-primary font-semibold">{email}</span> — le lien expire dans 15 minutes.
                  </p>
                  <button
                    onClick={() => { setMagicSent(false); setMode("password"); }}
                    className="mt-5 text-sm text-violet-royal hover:text-cyan-electric transition-colors font-medium"
                  >
                    Retour à la connexion
                  </button>
                </motion.div>
              ) : (
                <motion.div key="form">
                  {/* Mode toggle tabs */}
                  <div className="flex gap-1 mb-6 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    {(["password", "magic"] as LoginMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMode(m); setError(null); }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[12px] font-semibold transition-all duration-200",
                          mode === m
                            ? "bg-white/[0.08] text-text-hero border border-white/[0.10]"
                            : "text-text-tertiary hover:text-text-secondary"
                        )}
                      >
                        {m === "password" ? (
                          <><Lock size={12} /> Mot de passe</>
                        ) : (
                          <><Sparkles size={12} /> Lien magique</>
                        )}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {mode === "password" ? (
                      <motion.form
                        key="password-form"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        onSubmit={handlePasswordLogin}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-widest">
                            Email
                          </label>
                          <input
                            type="email"
                            placeholder="prenom@example.com"
                            required
                            autoFocus
                            autoComplete="email"
                            className={inputClass}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-widest">
                              Mot de passe
                            </label>
                            <a
                              href="/auth/reset"
                              className="text-[11px] text-text-tertiary hover:text-violet-royal transition-colors font-medium"
                            >
                              Oublié ?
                            </a>
                          </div>
                          <input
                            type="password"
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                            className={inputClass}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className={cn(
                            "group w-full flex items-center justify-center gap-2 mt-2",
                            "px-6 py-[14px] rounded-xl",
                            "bg-gradient-to-r from-violet-royal to-[#6C3CE0]",
                            "text-white text-sm font-bold",
                            "transition-all duration-200",
                            "hover:shadow-[0_0_28px_rgba(140,82,255,0.45)]",
                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                            "active:scale-[0.98]"
                          )}
                        >
                          {loading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Vérification…
                            </>
                          ) : (
                            <>
                              Accéder au dashboard
                              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </button>
                      </motion.form>
                    ) : (
                      <motion.form
                        key="magic-form"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        onSubmit={handleMagicLink}
                        className="space-y-4"
                      >
                        <p className="text-[13px] text-text-secondary leading-relaxed">
                          On t&apos;envoie un lien sécurisé valable 15 minutes. Pas besoin de mot de passe.
                        </p>
                        <div>
                          <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-widest">
                            Email
                          </label>
                          <input
                            type="email"
                            placeholder="prenom@example.com"
                            required
                            autoFocus
                            autoComplete="email"
                            className={inputClass}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading || !email}
                          className={cn(
                            "group w-full flex items-center justify-center gap-2",
                            "px-6 py-[14px] rounded-xl",
                            "bg-white/[0.06] border border-white/[0.12]",
                            "text-text-primary text-sm font-bold",
                            "transition-all duration-200",
                            "hover:bg-white/[0.10] hover:border-violet-royal/40",
                            "disabled:opacity-40 disabled:cursor-not-allowed",
                            "active:scale-[0.98]"
                          )}
                        >
                          {loading ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Envoi…
                            </>
                          ) : (
                            <>
                              <Mail size={16} />
                              Envoyer le lien
                              <ChevronRight size={14} className="ml-auto transition-transform group-hover:translate-x-0.5" />
                            </>
                          )}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer card */}
          <div className="px-8 py-5 border-t border-white/[0.06] bg-white/[0.02]">
            <p className="text-center text-[12px] text-text-tertiary">
              Pas encore sur FOREAS ?{" "}
              <a
                href="https://foreas.xyz/devenir-partenaire"
                className="text-violet-royal font-semibold hover:text-cyan-electric transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Devenir directeur de groupe
              </a>
            </p>
          </div>
        </div>

        {/* Bottom meta */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 text-center text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium"
        >
          Coopérative d&apos;Activité et d&apos;Emploi · CAE VTC-T3P · 100% légal
        </motion.p>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#000000]">
          <Loader2 size={20} className="animate-spin text-violet-royal" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
