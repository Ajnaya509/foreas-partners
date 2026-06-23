import { DriverSidebar } from "@/components/foreas/DriverSidebar";
import { TopBar } from "@/components/foreas/TopBar";
import { AjnayaDriverChat } from "@/components/foreas/AjnayaDriverChat";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?role=driver&next=/driver");

  const { data: driver } = await supabase
    .from("drivers")
    .select("first_name, last_name, referral_code, total_direct_referrals")
    .eq("id", user.id)
    .maybeSingle();

  const driverName = driver
    ? `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim() || "Chauffeur"
    : user.email?.split("@")[0] ?? "Chauffeur";
  const referralCode = driver?.referral_code ?? "FOREAS-NEW";

  return (
    <div className="flex min-h-screen">
      <DriverSidebar driverName={driverName} referralCode={referralCode} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar partnerName={driverName} notificationsCount={0} />
        <main className="flex-1 px-lg lg:px-xl py-lg lg:py-xl">{children}</main>
      </div>
      {/* Porte Ajnaya — copilote chauffeur (scope strict : courses/gains/zones/parrainage) */}
      <AjnayaDriverChat driverName={driverName} />
    </div>
  );
}
