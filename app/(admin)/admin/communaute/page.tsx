import { AdminPlaceholder } from "@/components/foreas/AdminPlaceholder";
import { MessageCircle } from "lucide-react";

export default function AdminCommunautePage() {
  return (
    <AdminPlaceholder
      title="Communauté"
      description="Modération messages chauffeurs, badges, alertes communautaires."
      icon={MessageCircle}
      features={[
        "Feed messages communauté FOREAS Drivers",
        "Modération IA + manuelle (community_alerts table)",
        "Badges et reconnaissance (community_badges)",
        "Statistiques engagement par ville",
      ]}
    />
  );
}
