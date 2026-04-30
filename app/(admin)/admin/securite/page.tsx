import { AdminPlaceholder } from "@/components/foreas/AdminPlaceholder";
import { Lock } from "lucide-react";

export default function AdminSecuritePage() {
  return (
    <AdminPlaceholder
      title="Sécurité & Fraude"
      description="Détection fraude, audit logs, signaux suspects."
      icon={Lock}
      features={[
        "Tables fraud_signals + fraud_emails + fraud_risk_scores",
        "Audit logs (audit_logs) avec recherche full-text",
        "Card fingerprints + device fingerprints",
        "Alertes cross-references (fraud_cross_references)",
      ]}
    />
  );
}
