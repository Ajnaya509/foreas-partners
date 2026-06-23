import { Eyebrow } from "@/components/foreas/Eyebrow";
import { GlassCard } from "@/components/foreas/GlassCard";
import { HeroGradientCard } from "@/components/foreas/HeroGradientCard";
import { Briefcase, Hotel, Building2, Star, Calendar, Lock } from "lucide-react";
import { getCurrentDriver } from "@/lib/queries/driver";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatEUR } from "@/lib/utils";

type Booking = {
  id: string;
  client_name: string | null;
  client_type: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  scheduled_at: string | null;
  fare_amount: number | null;
  status: string | null;
};

export default async function DriverClientsPrivesPage() {
  const driver = await getCurrentDriver();
  if (!driver) redirect("/login?next=/driver/clients-prives");

  const supabase = await createClient();

  // Courses privées assignées à ce chauffeur
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select("id, client_name, client_type, pickup_address, dropoff_address, scheduled_at, fare_amount, status")
    .eq("driver_id", driver.id)
    .in("status", ["pending", "confirmed"])
    .order("scheduled_at", { ascending: true })
    .limit(20);

  const bookings = (bookingsRaw ?? []) as Booking[];

  const iconFor = (type: string | null) => {
    if (!type) return <Building2 size={16} />;
    const t = type.toLowerCase();
    if (t.includes("hotel") || t.includes("hôtel")) return <Hotel size={16} />;
    if (t.includes("concierge") || t.includes("vip")) return <Star size={16} />;
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
          Courses hors Uber/Bolt distribuées par ton directeur de groupe.
          Tu gardes 100% de la course, moins la commission FOREAS.
        </p>
      </header>

      <HeroGradientCard glow={bookings.length > 0}>
        <div className="flex items-start gap-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black/30 border border-white/10">
            <Briefcase size={24} className="text-white" />
          </div>
          <div>
            <Eyebrow>
              {bookings.length > 0 ? `${bookings.length} course${bookings.length > 1 ? "s" : ""} disponible${bookings.length > 1 ? "s" : ""}` : "Aucune course assignée"}
            </Eyebrow>
            <h2 className="mt-xxs text-h1 font-bold text-text-hero">
              {bookings.length > 0
                ? "Courses en attente de confirmation"
                : "Pas de course privée pour l'instant"}
            </h2>
            <p className="mt-xs text-body text-text-secondary">
              {bookings.length > 0
                ? "Ton directeur de groupe t'a assigné des courses hôtels et conciergeries. Confirme avant les délais."
                : "Les courses privées te sont assignées par ton directeur de groupe quand des contrats hôtels ou B2B sont actifs sur ta zone."}
            </p>
          </div>
        </div>
      </HeroGradientCard>

      {bookings.length > 0 ? (
        <section>
          <Eyebrow>Opportunités assignées</Eyebrow>
          <div className="mt-md space-y-md">
            {bookings.map((b) => (
              <GlassCard key={b.id} className="hover:border-cyan-electric/40 transition-colors">
                <div className="flex items-start gap-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-electric/15 text-cyan-electric">
                    {iconFor(b.client_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-body-bold text-text-primary">{b.client_name ?? "Client VIP"}</div>
                    {b.pickup_address && b.dropoff_address && (
                      <div className="mt-xxs text-caption text-text-secondary truncate">
                        {b.pickup_address} → {b.dropoff_address}
                      </div>
                    )}
                    {b.scheduled_at && (
                      <div className="mt-xs flex items-center gap-xs text-caption text-text-tertiary">
                        <Calendar size={12} />
                        {new Intl.DateTimeFormat("fr-FR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(new Date(b.scheduled_at))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end shrink-0 gap-xs">
                    {b.fare_amount && (
                      <div className="text-display-l font-extrabold text-cyan-electric tabular-nums">
                        {formatEUR(b.fare_amount)}
                      </div>
                    )}
                    <button className="px-md py-xs rounded-lg bg-gradient-royal text-white text-caption font-bold shadow-glow halo-glow">
                      Confirmer
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      ) : (
        <GlassCard className="text-center py-huge">
          <Lock size={36} className="mx-auto text-text-tertiary mb-md" />
          <h3 className="text-h2 font-bold text-text-hero">Pipeline en construction</h3>
          <p className="mt-xs text-body text-text-secondary max-w-md mx-auto">
            Ton directeur de groupe négocie en ce moment des contrats hôtels, conciergeries
            et corporate sur ta zone. Dès qu&apos;une course t&apos;est assignée, elle apparaît ici
            avec le tarif fixé à l&apos;avance.
          </p>
          <p className="mt-md text-caption text-text-tertiary">
            Aucune commission d&apos;Uber sur ces courses. Tu gardes tout.
          </p>
        </GlassCard>
      )}

      {/* Comment ça marche */}
      <GlassCard variant="low">
        <Eyebrow variant="cyan">Comment ça marche</Eyebrow>
        <h3 className="mt-xxs text-h3 font-bold text-text-hero">3 étapes simples</h3>
        <div className="mt-md grid grid-cols-1 sm:grid-cols-3 gap-md">
          {[
            { step: "1", label: "Ton directeur signe un contrat B2B", desc: "Hôtel, conciergerie, cabinet médical." },
            { step: "2", label: "Il t'assigne une course", desc: "Tu reçois le détail ici + sur l'app." },
            { step: "3", label: "Tu encaisses 100% du tarif", desc: "Seule la commission FOREAS est déduite." },
          ].map((s) => (
            <div key={s.step} className="p-md rounded-lg bg-glass-low border border-glass-border">
              <div className="text-display-l font-extrabold text-cyan-electric/30 tabular-nums">{s.step}</div>
              <div className="mt-xs text-body-bold text-text-primary">{s.label}</div>
              <div className="mt-xxs text-caption text-text-secondary">{s.desc}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
