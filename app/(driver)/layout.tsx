import { DriverSidebar } from "@/components/foreas/DriverSidebar";
import { TopBar } from "@/components/foreas/TopBar";
import { AjnayaDriverChat } from "@/components/foreas/AjnayaDriverChat";
import { getDriverReferralContext } from "@/lib/driver/referral-server";
import { driverReferralCode } from "@/lib/driver/referral";
import { redirect } from "next/navigation";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const context = await getDriverReferralContext();
  if (context.status === "unavailable" && context.code === "AUTH_REQUIRED")
    redirect("/login?role=driver&next=/driver");
  const driver = context.status === "ready" ? context.profile : null;
  const driverName = driver
    ? `${driver.first_name ?? ""} ${driver.last_name ?? ""}`.trim() || "Chauffeur"
    : "Chauffeur";
  const referralCode = driverReferralCode(driver);

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
