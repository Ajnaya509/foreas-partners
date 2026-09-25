import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readAdminAccess } from "@/lib/admin-access";
import { AdminMfaForm } from "./AdminMfaForm";

export const dynamic = "force-dynamic";

export default async function AdminMfaPage() {
  const access = await readAdminAccess(await createClient());
  if (access.status === "allowed") redirect("/admin/pieuvre");
  if (access.status === "unauthenticated") redirect("/login?role=admin&next=/admin");
  if (access.status === "forbidden") redirect("/login?role=admin&error=access_denied");
  if (access.status !== "mfa_required" || !access.userId) {
    return <main className="min-h-screen grid place-items-center p-lg"><div className="glass-card max-w-md p-xl" role="alert">
      <h1 className="text-xl text-text-hero mb-md">Vérification indisponible</h1>
      <p className="text-text-secondary">L’accès reste fermé. Réessaie dans un instant.</p>
      <a href="/auth/admin-mfa" className="inline-block mt-lg text-cyan-electric">Réessayer</a>
    </div></main>;
  }
  return <AdminMfaForm userId={access.userId} />;
}
