import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";

const RAILWAY_API = process.env.RAILWAY_API_URL ?? "https://app.foreas.xyz";

interface HandoffPayload {
  identity_id?: string;
  source_canal?: string;
  state?: {
    intent?: string;
    prompt_for_next_canal?: string;
  };
}

async function claimToken(token: string): Promise<HandoffPayload | null> {
  try {
    const res = await fetch(`${RAILWAY_API}/api/app/claim-handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HandoffPayload;
  } catch {
    return null;
  }
}

async function HandoffClaimContent({ token }: { token?: string }) {
  if (!token) {
    return (
      <GlassCard variant="elevated" className="text-center max-w-md">
        <Eyebrow>Erreur</Eyebrow>
        <h1 className="mt-xs text-h1 font-extrabold text-text-hero">Lien invalide</h1>
        <p className="mt-md text-body text-text-secondary">
          Aucun token de handoff fourni. Tu peux te connecter directement.
        </p>
        <a
          href="/login"
          className="mt-lg inline-flex items-center gap-xs px-lg py-md rounded-lg bg-gradient-royal text-white text-body-bold halo-pulse"
        >
          Aller à la connexion <ArrowRight size={16} />
        </a>
      </GlassCard>
    );
  }

  // Tenter de réclamer le token
  const payload = await claimToken(token);

  // Vérifier session Supabase
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Déjà authentifié → redirect vers le bon dashboard selon role
    const intent = payload?.state?.intent;
    if (intent === "partner_dashboard") redirect("/partner");
    if (intent === "admin_dashboard") redirect("/admin");
    if (intent === "driver_dashboard") redirect("/driver");

    // Fallback : check role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();
    const role = (roleRow as { role: string } | null)?.role;
    if (role === "admin" || role === "super_admin") redirect("/admin");
    if (role === "partner") redirect("/partner");
    redirect("/driver");
  }

  // Pas authentifié → vers login avec next param et state préservé
  const intent = payload?.state?.intent ?? "partner_dashboard";
  const next =
    intent === "admin_dashboard"
      ? "/admin"
      : intent === "driver_dashboard"
      ? "/driver"
      : "/partner";

  return (
    <GlassCard variant="elevated" className="text-center max-w-md">
      <ShieldCheck size={36} className="mx-auto text-success mb-md" />
      <Eyebrow>Handoff sécurisé</Eyebrow>
      <h1 className="mt-xs text-h1 font-extrabold text-text-hero">Continuons ta session</h1>
      <p className="mt-md text-body text-text-secondary">
        Ton lien depuis foreas.xyz a été validé. Connecte-toi pour accéder à ton espace.
      </p>
      <a
        href={`/login?next=${encodeURIComponent(next)}`}
        className="mt-lg inline-flex items-center gap-xs px-lg py-md rounded-lg bg-gradient-royal text-white text-body-bold halo-pulse"
      >
        Se connecter <ArrowRight size={16} />
      </a>
      <p className="mt-md text-micro uppercase tracking-wider text-text-muted">
        Identity Bridge actif · Source : {payload?.source_canal ?? "site"}
      </p>
    </GlassCard>
  );
}

export default async function HandoffClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center p-lg">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/3 -left-1/4 w-[500px] h-[500px] rounded-full bg-violet-royal/15 blur-[120px]" />
        <div className="absolute bottom-1/3 -right-1/4 w-[500px] h-[500px] rounded-full bg-cyan-electric/10 blur-[120px]" />
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-md">
            <Loader2 size={32} className="animate-spin text-violet-royal" />
            <p className="text-caption text-text-tertiary">Validation du token de handoff…</p>
          </div>
        }
      >
        <HandoffClaimContent token={params.token} />
      </Suspense>
    </div>
  );
}
