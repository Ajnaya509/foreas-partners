import { AdminPlaceholder } from "@/components/foreas/AdminPlaceholder";
import { Shield } from "lucide-react";

export default function AdminModerationPage() {
  return (
    <AdminPlaceholder
      title="Modération"
      description="Signalements, comportements suspects, suspensions."
      icon={Shield}
      features={[
        "File de modération messages signalés",
        "Vérification cartes VTC (vtc_card_verified)",
        "Suspensions chauffeurs avec audit trail",
        "Décisions IA assistées (modération via Claude)",
      ]}
    />
  );
}
