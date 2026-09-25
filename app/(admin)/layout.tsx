import { AdminFrame } from "@/components/founder/AdminFrame";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { readAdminAccess } from "@/lib/admin-access";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const access = await readAdminAccess(supabase);
  if (access.status === "unauthenticated") redirect("/login?role=admin&next=/admin");
  if (access.status === "mfa_required") redirect("/auth/admin-mfa");
  if (access.status === "forbidden") {
    const { data: partner } = await supabase.from("partners").select("id").eq("user_id", access.userId).maybeSingle();
    redirect(partner ? "/partner" : "/driver");
  }
  if (access.status !== "allowed" || !access.userId) {
    return <main className="min-h-screen grid place-items-center p-lg"><div role="alert" className="glass-card max-w-md p-xl">
      <h1 className="text-xl text-text-hero mb-md">Vérification indisponible</h1>
      <p className="text-text-secondary">L’administration reste fermée. Réessaie dans un instant.</p>
      <a href="/auth/admin-mfa" className="inline-block mt-lg text-cyan-electric">Réessayer</a>
    </div></main>;
  }
  const user = { id: access.userId, email: access.email };

  const adminName = user.email?.split("@")[0] ?? "Admin";

  return <AdminFrame adminName={adminName} adminEmail={user.email ?? ""}>{children}</AdminFrame>;
}
