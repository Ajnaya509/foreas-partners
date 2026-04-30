import { AdminPlaceholder } from "@/components/foreas/AdminPlaceholder";
import { Target } from "lucide-react";

export default function AdminAcquisitionPage() {
  return (
    <AdminPlaceholder
      title="Acquisition & Funnel"
      description="Tracking des sources d'acquisition, conversions, pipeline B2B."
      icon={Target}
      features={[
        "Funnel détaillé visiteurs → trial → payant → actif J30",
        "Sources d'acquisition (LeBonCoin, Facebook, organic, paid)",
        "Pipeline B2B Apollo + Instantly avec stages",
        "Coût d'acquisition (CAC) par segment",
      ]}
    />
  );
}
