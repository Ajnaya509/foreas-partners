"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { ForeasLogo } from "@/components/foreas/ForeasLogo";
import { ForeasDivider } from "@/components/foreas/ForeasDivider";
import { Eyebrow } from "@/components/foreas/Eyebrow";
import { cn } from "@/lib/utils";

type State = "idle" | "loading" | "success" | "error";

export default function AuthUpdatePage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const isMatch = password === confirm;
  const isStrong = password.length >= 8;
  const canSubmit = isMatch && isStrong && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState("loading");
    setErrorMsg(null);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message);
        setState("error");
        return;
      }

      setState("success");

      // After 2s, smart redirect
      setTimeout(async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) { router.push("/login"); return; }

        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .in("role", ["admin", "super_admin"])
          .eq("is_active", true)
          .is("revoked_at", null)
          .maybeSingle();

        if (adminRole) { router.push("/admin"); return; }

        const { data: partner } = await supabase
          .from("partners").select("id").eq("user_id", user.id).maybeSingle();
        if (partner) { router.push("/partner"); return; }

        router.push("/driver");
      }, 2000);
    } catch {
      setErrorMsg("Erreur réseau. Réessaie.");
      setState("error");
    }
  };

  const inputClass = cn(
    "w-full px-md py-[14px] rounded-xl pr-12",
    "bg-white/[0.04] border border-white/[0.08]",
    "text-base text-text-primary placeholder:text-text-tertiary",
    "focus:outline-none focus:border-violet-royal/60 focus:bg-white/[0.06]",
    "transition-all duration-200"
  );

  const strengthLevel = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColors = ["bg-transparent", "bg-danger", "bg-warning", "bg-success"];
  const strengthLabels = ["", "Trop court", "Correct", "Fort"];

  return (
    <div className="min-h-screen flex items-center justify-center p-lg bg-[#000000]">
      {/* Halos */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[550px] rounded-full bg-violet-royal/[0.14] blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-success/[0.05] blur-[120px]" />
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
            <Eyebrow>Sécurité · Nouveau mot de passe</Eyebrow>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl overflow-hidden">
          <div className="p-8">
            <AnimatePresence mode="wait">
              {state === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-center py-4"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10 border border-success/20 mx-auto mb-5">
                    <CheckCircle2 size={28} className="text-success" />
                  </div>
                  <h2 className="text-xl font-extrabold text-text-hero">Mot de passe mis à jour</h2>
                  <p className="mt-3 text-sm text-text-secondary">
                    Accès sécurisé. Redirection vers ton dashboard…
                  </p>
                  <div className="mt-4 flex justify-center">
                    <Loader2 size={16} className="animate-spin text-violet-royal" />
                  </div>
                </motion.div>
              ) : (
                <motion.div key="form">
                  <div className="mb-7">
                    <h1 className="text-2xl font-extrabold text-text-hero tracking-tight">
                      Nouveau mot de passe
                    </h1>
                    <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                      Choisis un mot de passe fort. Il remplacera l&apos;ancien immédiatement.
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
                        Nouveau mot de passe
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimum 8 caractères"
                          required
                          autoFocus
                          autoComplete="new-password"
                          className={inputClass}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={state === "loading"}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Strength indicator */}
                      {password.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2"
                        >
                          <div className="flex gap-1">
                            {[1, 2, 3].map((level) => (
                              <div
                                key={level}
                                className={cn(
                                  "h-1 flex-1 rounded-full transition-all duration-300",
                                  strengthLevel >= level ? strengthColors[strengthLevel] : "bg-white/[0.08]"
                                )}
                              />
                            ))}
                          </div>
                          <p className={cn(
                            "mt-1 text-[11px] font-medium transition-colors",
                            strengthLevel === 1 ? "text-danger" : strengthLevel === 2 ? "text-warning" : "text-success"
                          )}>
                            {strengthLabels[strengthLevel]}
                          </p>
                        </motion.div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-text-tertiary mb-2 uppercase tracking-widest">
                        Confirmer
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Même mot de passe"
                          required
                          autoComplete="new-password"
                          className={cn(
                            inputClass,
                            confirm.length > 0 && !isMatch && "border-danger/40 focus:border-danger/60"
                          )}
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          disabled={state === "loading"}
                        />
                        {confirm.length > 0 && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isMatch ? (
                              <CheckCircle2 size={16} className="text-success" />
                            ) : (
                              <AlertCircle size={16} className="text-danger" />
                            )}
                          </div>
                        )}
                      </div>
                      {confirm.length > 0 && !isMatch && (
                        <p className="mt-1 text-[11px] text-danger font-medium">Les mots de passe ne correspondent pas</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!canSubmit || state === "loading"}
                      className={cn(
                        "group w-full flex items-center justify-center gap-2",
                        "px-6 py-[14px] rounded-xl",
                        "bg-gradient-to-r from-violet-royal to-[#6C3CE0]",
                        "text-white text-sm font-bold",
                        "transition-all duration-200",
                        "hover:shadow-[0_0_28px_rgba(140,82,255,0.45)]",
                        "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
                        "active:scale-[0.98]"
                      )}
                    >
                      {state === "loading" ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Mise à jour…
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          Définir le nouveau mot de passe
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-text-muted uppercase tracking-[0.2em] font-medium">
          Coopérative d&apos;Activité et d&apos;Emploi · CAE VTC-T3P
        </p>
      </motion.div>
    </div>
  );
}
