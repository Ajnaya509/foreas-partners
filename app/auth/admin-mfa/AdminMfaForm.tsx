"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassCard } from "@/components/foreas/GlassCard";
import { ForeasLogo } from "@/components/foreas/ForeasLogo";
import { createAdminMfaSession } from "@/lib/admin-mfa-session";
import { createAdminMfaFlow, type MfaState } from "@/lib/admin-mfa-flow";
import { checkAdminMfaAccess } from "./actions";

const initial: MfaState = { phase: "loading", busy: false, error: null, factors: [], factorId: null, qrCode: null, secret: null };

export function AdminMfaForm({ userId, checkAccess = checkAdminMfaAccess, onVerified }: {
  userId: string;
  checkAccess?: (expected: string) => Promise<Pick<import("@/lib/admin-access").AdminAccess, "status" | "userId">>;
  onVerified?: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<MfaState>(initial);
  const [code, setCode] = useState("");
  const flow = useRef<ReturnType<typeof createAdminMfaFlow> | null>(null);
  useEffect(() => {
    setState(initial); setCode("");
    const client = createClient();
    const transport = createAdminMfaSession(client, userId, { url: process.env.NEXT_PUBLIC_SUPABASE_URL!, key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
    const run = createAdminMfaFlow(client, userId, checkAccess, next => {
      setState(next);
      if (next.phase === "closed" || next.phase === "done") setCode("");
    }, () => { if(onVerified) onVerified(); else { router.replace("/admin"); router.refresh(); } }, transport);
    flow.current = run;
    void run.initialize();
    return () => { run.dispose(); if (flow.current === run) flow.current = null; };
  }, [userId, router, checkAccess, onVerified]);
  const qr = state.qrCode?.startsWith("data:image/svg+xml") ? state.qrCode
    : state.qrCode?.trim().startsWith("<svg") ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.qrCode)}` : null;

  return <main className="min-h-screen grid place-items-center px-md py-xl">
    <GlassCard className="w-full max-w-md">
      <div className="mb-xl"><ForeasLogo /></div>
      <p className="text-xs tracking-widest uppercase text-cyan-electric mb-sm">Administration</p>
      <h1 className="text-2xl text-text-hero font-semibold mb-md">Confirme que c’est bien toi</h1>
      <p className="text-text-secondary mb-lg">L’administration s’ouvre après le code de ton application d’authentification.</p>
      {state.error && <p role="alert" className="mb-lg rounded-lg border border-danger/30 bg-danger/10 p-md text-sm text-danger">{state.error}</p>}
      {state.phase === "loading" && <div aria-live="polite"><p className="text-text-secondary">Vérification de l’accès…</p>
        {!state.busy && state.error && <button className="mt-md text-cyan-electric" onClick={() => void flow.current?.initialize()}>Réessayer</button>}
      </div>}
      {state.phase === "enroll" && <div>
        <p className="text-text-secondary text-sm mb-lg">Ajoute FOREAS à une application comme Google Authenticator ou Microsoft Authenticator. Tes appareils déjà inscrits sont conservés.</p>
        <button type="button" disabled={state.busy} onClick={() => void flow.current?.enroll()} className="w-full min-h-12 rounded-lg bg-violet-royal px-lg py-md text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-electric">{state.busy ? "Préparation…" : "Configurer mon application"}</button>
      </div>}
      {state.phase === "code" && <form onSubmit={event => { event.preventDefault(); void flow.current?.verify(code); }}>
        {qr && <div className="mb-lg"><p className="text-sm text-text-secondary mb-md">Scanne ce carré dans ton application d’authentification.</p>
          {/* Donnée Supabase réservée à l'utilisateur courant, jamais une URL distante. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Code à scanner pour inscrire FOREAS" width={220} height={220} className="mx-auto bg-white rounded-lg p-sm" />
        </div>}
        {state.secret && <details className="mb-lg text-sm text-text-secondary"><summary className="cursor-pointer text-cyan-electric">Saisir la clé manuellement</summary><code className="block break-all py-md select-all">{state.secret}</code></details>}
        {state.factors.length > 1 && <label className="block text-sm text-text-secondary mb-md">Appareil
          <select disabled={state.busy} value={state.factorId ?? ""} onChange={event => { setCode(""); flow.current?.selectFactor(event.target.value); }} className="mt-sm w-full rounded-lg border border-white/20 bg-obsidian-light p-md text-text-hero">{state.factors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        </label>}
        <label htmlFor="admin-mfa-code" className="block text-sm text-text-secondary mb-sm">Code à 6 chiffres</label>
        <input id="admin-mfa-code" name="code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} disabled={state.busy} required className="w-full rounded-lg border border-white/20 bg-obsidian-light p-md text-center text-2xl tracking-widest text-text-hero focus:outline focus:outline-2 focus:outline-cyan-electric" />
        <button type="submit" disabled={state.busy || code.length !== 6} className="mt-lg w-full min-h-12 rounded-lg bg-violet-royal px-lg py-md text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-electric">{state.busy ? "Vérification…" : "Confirmer mon code"}</button>
      </form>}
      {state.phase === "done" && <p role="status" className="text-text-secondary">Code confirmé. Ouverture de l’administration…</p>}
      <a href="/login?role=admin&next=/admin" className="inline-block mt-xl text-sm text-cyan-electric">Revenir à la connexion</a>
    </GlassCard>
  </main>;
}
