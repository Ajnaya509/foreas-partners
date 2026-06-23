import { AdminSidebar } from "@/components/foreas/AdminSidebar";
import { TopBar } from "@/components/foreas/TopBar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isCurrentUserAdmin } from "@/lib/queries/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?role=admin&next=/admin");

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    // Connecté mais pas admin → soft redirect vers son espace légitime
    const { data: partner } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    redirect(partner ? "/partner" : "/driver");
  }

  const adminName = user.email?.split("@")[0] ?? "Admin";

  return (
    <div className="flex min-h-screen">
      <AdminSidebar adminName={adminName} adminEmail={user.email ?? ""} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar partnerName={adminName} notificationsCount={2} />
        <main className="flex-1 px-lg lg:px-xl py-lg lg:py-xl">{children}</main>
      </div>
    </div>
  );
}
