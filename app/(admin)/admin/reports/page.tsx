import { AdminPlaceholder } from "@/components/foreas/AdminPlaceholder";
import { BarChart3 } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <AdminPlaceholder
      title="Reports & Exports"
      description="Rapports exportables, KPIs périodiques, ventilation par segment."
      icon={BarChart3}
      features={[
        "Export CSV/Excel des KPIs (drivers, partenaires, finance)",
        "Rapport mensuel auto envoyé Telegram (M10 brief)",
        "Comparatifs périodes (mois N vs N-1, YoY)",
        "Vues custom DuckDB pour analytics avancées",
      ]}
    />
  );
}
