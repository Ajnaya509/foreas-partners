import { Eyebrow } from "./Eyebrow";
import { GlassCard } from "./GlassCard";
import type { LucideIcon } from "lucide-react";

interface AdminPlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features?: string[];
}

export function AdminPlaceholder({ title, description, icon: Icon, features }: AdminPlaceholderProps) {
  return (
    <div className="space-y-xl animate-fade-in-down">
      <header>
        <Eyebrow>Console Admin</Eyebrow>
        <h1 className="mt-xxs text-display-l font-extrabold text-text-hero">{title}</h1>
        <p className="mt-xs text-body-lg text-text-secondary">{description}</p>
      </header>

      <GlassCard variant="elevated" className="text-center py-huge">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-royal/15 text-violet-royal mb-md">
          <Icon size={32} />
        </div>
        <h2 className="text-h1 font-bold text-text-hero">Module en cours d&apos;activation</h2>
        <p className="mt-xs text-body text-text-secondary max-w-2xl mx-auto">
          Cette section sera connectée aux données réelles dans les prochains jours.
          Le squelette UI est en place, le wiring Supabase + Pieuvre suit.
        </p>

        {features && features.length > 0 && (
          <div className="mt-xl max-w-md mx-auto text-left">
            <Eyebrow>Features prévues</Eyebrow>
            <ul className="mt-sm space-y-xs">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-xs text-caption text-text-secondary">
                  <span className="text-violet-royal">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
