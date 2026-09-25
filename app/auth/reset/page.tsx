"use client";

import {safePortalNext} from '@/lib/partner/navigation';

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { ForeasLogo } from "@/components/foreas/ForeasLogo";
import { Eyebrow } from "@/components/foreas/Eyebrow";
import { cn } from "@/lib/utils";
import { authPath, emailErrorMessage } from "@/lib/auth-navigation";

type State = "idle" | "loading" | "sent" | "error";

function AuthResetForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const next = safePortalNext(useSearchParams().get("next"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg(null);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}${authPath("/auth/callback", next, { type: "recovery" })}`,
      });

      if (error) {
        setErrorMsg(emailErrorMessage(error));
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
    <div className="auth-page">
      {/* Halos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-royal/[0.12] blur-[140px]" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-cyan-electric/[0.06] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="auth-container"
      >
        {/* Logo */}
        <div className="auth-brand">
          <div className="flex justify-center mb-4">
            <ForeasLogo variant="full" color="#F8FAFC" height={32} />
          </div>
          
          <div className="mt-4">
            <Eyebrow>Accès FOREAS</Eyebrow>
          </div>
          <p className="auth-brand-message">Toujours plus loin.</p>
          <p className="auth-brand-note">Un lien reçu par e-mail te permettra de choisir un nouveau mot de passe.</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="auth-card-inner">
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
                  <h2 className="auth-title">Lien envoyé</h2>
                  <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                    Un email a été envoyé à{" "}
                    <span className="text-text-primary font-semibold">{email}</span>.
                    Clique sur le lien pour définir un nouveau mot de passe.
                    Ouvre-le dans ce même navigateur. Il ne fonctionne qu’une fois.
                  </p>
                  <p className="mt-4 text-xs text-text-tertiary">
                    Pas reçu ? Vérifie tes spams ou réessaie dans quelques minutes.
                  </p>
                  <a
                    href={authPath("/login", next)}
                    className="mt-6 inline-flex items-center gap-2 text-sm text-violet-royal hover:text-cyan-electric transition-colors font-semibold"
                  >
                    <ArrowLeft size={14} />
                    Retour à la connexion
                  </a>
                </motion.div>
              ) : (
                <motion.div key="form">
                  <div className="mb-7">
                    <h1 className="auth-title">
                      Mot de passe oublié ?
                    </h1>
                    <p className="auth-subtitle">
                      Entre ton email pour recevoir un lien. Ouvre-le dans ce même navigateur.
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
                        <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-danger/[0.08] border border-danger/25 text-[13px] text-danger">
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
                          Recevoir un lien
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
              href={authPath("/login", next)}
              className="flex items-center justify-center gap-2 text-[12px] text-text-tertiary hover:text-violet-royal transition-colors font-medium"
            >
              <ArrowLeft size={12} />
              Retour à la connexion
            </a>
          </div>
        </div>

        <p className="auth-footer">
          © 2026 FOREAS. Tous droits réservés.
        </p>
      </motion.div>
    </div>
  );
}

export default function AuthResetPage() {
  return <Suspense fallback={<div className="min-h-screen bg-black" />}><AuthResetForm /></Suspense>;
}
