"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { ForeasLogo } from "@/components/foreas/ForeasLogo";
import { ForeasDivider } from "@/components/foreas/ForeasDivider";
import { Eyebrow } from "@/components/foreas/Eyebrow";
import { cn } from "@/lib/utils";

type State = "idle" | "loading" | "sent" | "error";

export default function AuthResetPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg(null);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        setErrorMsg(error.message);
        setState("error");
        return;
      }

      setState("sent");
    } catch {
      setErrorMsg("Une erreur réseau est survenue. Réessaie.");
      setState("error");
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
      {/* Halos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-royal/[0.12] blur-[140px]" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-cyan-electric/[0.06] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[400px]"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <ForeasLogo variant="full" color="#F8FAFC" height={32} />
          </div>
          <ForeasDivider className="mx-auto max-w-[160px]" opacity={0.4} />
          <div className="mt-4">
            <Eyebrow>Sécurité · Récupération d&apos;accès</Eyebrow>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl overflow-hidden">
          <div className="p-8">
            <AnimatePresence mode="wait">
              {state === "sent" ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center py-4"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 border border-success/20 mx-auto mb-5">
                    <CheckCircle2 size={28} className="text-success" />
                  </div>
                  <h2 className="text-xl font-extrabold text-text-hero">Lien envoyé</h2>
                  <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                    Un email a été envoyé à{" "}
                    <span className="text-text-primary font-semibold">{email}</span>.
                    Clique sur le lien pour définir un nouveau mot de passe.
                    Il expire dans <span className="text-text-primary font-semibold">15 minutes</span>.
                  </p>
                  <p className="mt-4 text-xs text-text-tertiary">
                    Pas reçu ? Vérifie tes spams ou réessaie dans quelques minutes.
                  </p>
                  <a
                    href="/login"
                    className="mt-6 inline-flex items-center gap-2 text-sm text-violet-royal hover:text-cyan-electric transition-colors font-semibold"
                  >
                    <ArrowLeft size={14} />
                    Retour à la connexion
                  </a>
                </motion.div>
              ) : (
                <motion.div key="form">
                  <div className="mb-7">
                    <h1 className="text-2xl font-extrabold text-text-hero tracking-tight">
                      Mot de passe oublié ?
                    </h1>
                    <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                      Entre ton email. On t&apos;envoie un lien sécurisé pour réinitialiser ton accès.
                    </p>
                  </div>

                  <AnimatePresence>
                    {(state === "error" && errorMsg) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-danger/[0.08] border border-danger/25 text-[13px] text-danger">
                          <AlertCircle size={14} className="shrink-0 mt-0.5" />
                          <span>{errorMsg}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-widest">
                        Adresse email
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
                        disabled={state === "loading"}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={state === "loading" || !email}
                      className={cn(
                        "group w-full flex items-center justify-center gap-2",
                        "px-6 py-[14px] rounded-xl",
                        "bg-gradient-to-r from-violet-royal to-[#6C3CE0]",
                        "text-white text-sm font-bold",
                        "transition-all duration-200",
                        "hover:shadow-[0_0_28px_rgba(140,82,255,0.45)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                        "active:scale-[0.98]"
                      )}
                    >
                      {state === "loading" ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Envoi en cours…
                        </>
                      ) : (
                        <>
                          <Mail size={16} />
                          Envoyer le lien de récupération
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-8 py-4 border-t border-white/[0.06] bg-white/[0.02]">
            <a
              href="/login"
              className="flex items-center justify-center gap-2 text-[12px] text-text-tertiary hover:text-violet-royal transition-colors font-medium"
            >
              <ArrowLeft size={12} />
              Retour à la connexion
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium">
          Coopérative d&apos;Activité et d&apos;Emploi · CAE VTC-T3P
        </p>
      </motion.div>
    </div>
  );
}
