import { AdminPlaceholder } from "@/components/foreas/AdminPlaceholder";
import { Server } from "lucide-react";

export default function AdminStackPage() {
  return (
    <AdminPlaceholder
      title="Stack & Monitoring"
      description="Santé infra : Railway, Supabase, Vercel, N8N, Twilio, ElevenLabs."
      icon={Server}
      features={[
        "Health checks tous services (uptime, latence)",
        "Coût mensuel par service (Anthropic, ElevenLabs, Twilio, Apollo)",
        "Quotas API restants (pieuvre_watchdog_logs)",
        "Alertes auto sur dépassements budget (Tentacule WATCHDOG)",
      ]}
    />
  );
}
