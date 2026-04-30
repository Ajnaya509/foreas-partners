import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // TODO Phase 2 : lire user_roles pour rediriger admin / driver / partner précisément
  if (user) {
    redirect("/partner");
  }

  redirect("/login");
}
