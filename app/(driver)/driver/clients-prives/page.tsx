import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { Briefcase, Hotel, Stethoscope, Building2, Star, Calendar } from "lucide-react";

export default function DriverClientsPrivesPage() {
  // Stub : courses VIP du jour (à wirer sur table bookings ou pieuvre_b2b_outreach_log futur)
  const opportunities = [
    {
      type: "hotel",
      name: "Hôtel Le Marais",
      pickup: "75004 Paris",
      destination: "Aéroport CDG (T2E)",
      time: "Aujourd'hui · 14:30",
      fare: 85,
      passenger: "M. Bernard",
    },
    {
      type: "company",
      name: "Cabinet Latham & Watkins",
      pickup: "75008 Paris",
      destination: "La Défense",
      time: "Aujourd'hui · 18:15",
      fare: 42,
      passenger: "Mme Vidal",
    },
    {
      type: "concierge",
      name: "Quintessentially",
      pickup: "75116 Paris",
      destination: "Versailles",
      time: "Demain · 09:00",
      fare: 120,
      passenger: "Client VIP",
    },
  ];

  const iconFor = (t: string) => {
    if (t === "hotel") return <Hotel size={16} />;
    if (t === "concierge") return <Star size={16} />;
    return <Building2 size={16} />;
  };

  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow variant="cyan">Plan VIP</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">
          Clients privés
        </h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Courses hors plateformes Uber/Bolt. Tu factures direct, tu gardes 100%.
        </p>
      </header>

      <GlassCard variant="highlight">
        <div className="flex items-start gap-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-ice shadow-glow-cyan">
            <Briefcase size={24} className="text-obsidian" />
          </div>
          <div>
            <h2 className="text-h1 font-bold text-text-hero">3 courses disponibles aujourd&apos;hui</h2>
            <p className="mt-xs text-body text-text-secondary">
              Distribuées par ton directeur de groupe FOREAS via les contrats B2B
              négociés par l&apos;équipe terrain (hôtels, conciergeries, entreprises).
            </p>
          </div>
        </div>
      </GlassCard>

      <section>
        <Eyebrow>Opportunités du jour</Eyebrow>
        <div className="mt-md space-y-md">
          {opportunities.map((o, i) => (
            <GlassCard key={i} className="hover:border-cyan-electric/40 transition-colors">
              <div className="flex items-start gap-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-electric/15 text-cyan-electric">
                  {iconFor(o.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-xs flex-wrap">
                    <span className="text-body-bold text-text-primary">{o.name}</span>
                    <span className="text-caption text-text-tertiary">·</span>
                    <span className="text-caption text-text-tertiary">{o.passenger}</span>
                  </div>
                  <div className="mt-xxs text-caption text-text-secondary">
                    {o.pickup} → {o.destination}
                  </div>
                  <div className="mt-xs flex items-center gap-xs text-caption text-text-tertiary">
                    <Calendar size={12} />
                    {o.time}
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-xs">
                  <div className="text-display-l font-extrabold text-cyan-electric">
                    {o.fare}€
                  </div>
                  <button className="px-md py-xs rounded-lg bg-gradient-royal text-white text-caption font-bold shadow-glow halo-glow">
                    Accepter
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>
    </div>
  );
}
