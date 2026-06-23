import { Sidebar } from "@/components/foreas/Sidebar";
import { TopBar } from "@/components/foreas/TopBar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?role=partner&next=/partner");
  }

  // Try to fetch partner profile (graceful fallback if not yet created)
  const { data: partner } = await supabase
    .from("partners")
    .select("id, company_name, contact_email, referral_code")
    .eq("contact_email", user.email)
    .maybeSingle();

  const partnerName =
    partner?.company_name ?? user.email?.split("@")[0] ?? "Directeur";
  const partnerCode = partner?.referral_code ?? "FOREAS-NEW";

  return (
    <div className="flex min-h-screen">
      <Sidebar partnerCode={partnerCode} partnerName={partnerName} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar partnerName={partnerName} notificationsCount={3} />
        <main className="flex-1 px-lg lg:px-xl py-lg lg:py-xl">{children}</main>
      </div>
    </div>
  );
}
