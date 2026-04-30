import { redirect } from "next/navigation";

/**
 * /dashboard est legacy — on redirige vers /partner (nouveau dashboard directeur).
 * Conservé pour ne pas casser les anciens liens.
 */
export default function LegacyDashboardRedirect() {
  redirect("/partner");
}
