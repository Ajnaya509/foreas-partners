"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { Eyebrow } from "./Eyebrow";
import { GlassCard } from "./GlassCard";
import { formatDateRelative } from "@/lib/utils";

type FeedEvent = {
  id: string;
  icon: string;
  text: string;
  type: "ride" | "subscriber" | "booking" | "conversation" | "alert" | "system";
  ts: Date;
};

const SEED_EVENTS: FeedEvent[] = [
  { id: "seed-1", icon: "🟢", text: "Karim accepte course Bolt 47€/h (Coach Réflexe)", type: "ride", ts: new Date(Date.now() - 12 * 1000) },
  { id: "seed-2", icon: "🆕", text: "Inscription : Yann · Marseille · trial 14j", type: "subscriber", ts: new Date(Date.now() - 60 * 1000) },
  { id: "seed-3", icon: "💳", text: "Booking confirmé : Hôtel Le Marais → CDG · 75€", type: "booking", ts: new Date(Date.now() - 3 * 60 * 1000) },
  { id: "seed-4", icon: "🐙", text: "Workflow M14 OK pour 87 drivers", type: "system", ts: new Date(Date.now() - 5 * 60 * 1000) },
  { id: "seed-5", icon: "🎯", text: "Nouveau prospect B2B Quintessentially", type: "conversation", ts: new Date(Date.now() - 8 * 60 * 1000) },
];

export function RealtimeFeed({ maxItems = 30 }: { maxItems?: number }) {
  const [events, setEvents] = useState<FeedEvent[]>(SEED_EVENTS);
  const [connected, setConnected] = useState(false);
  const idCounter = useRef(0);

  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rides" },
        (payload) => {
          const r = payload.new as { fare_amount?: number; platform?: string };
          idCounter.current += 1;
          setEvents((prev) =>
            [
              {
                id: `rt-${Date.now()}-${idCounter.current}`,
                icon: "🟢",
                text: `Course ${r.platform ?? "?"} · ${r.fare_amount ?? 0}€`,
                type: "ride" as const,
                ts: new Date(),
              },
              ...prev,
            ].slice(0, maxItems)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "drivers" },
        (payload) => {
          const d = payload.new as { first_name?: string };
          idCounter.current += 1;
          setEvents((prev) =>
            [
              {
                id: `rt-${Date.now()}-${idCounter.current}`,
                icon: "🆕",
                text: `Nouveau chauffeur : ${d.first_name ?? "anonyme"}`,
                type: "subscriber" as const,
                ts: new Date(),
              },
              ...prev,
            ].slice(0, maxItems)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "subscribers" },
        () => {
          idCounter.current += 1;
          setEvents((prev) =>
            [
              {
                id: `rt-${Date.now()}-${idCounter.current}`,
                icon: "💳",
                text: "Nouvel abonné Stripe",
                type: "subscriber" as const,
                ts: new Date(),
              },
              ...prev,
            ].slice(0, maxItems)
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pieuvre_dg_conversations" },
        (payload) => {
          const c = payload.new as { user_message?: string };
          idCounter.current += 1;
          setEvents((prev) =>
            [
              {
                id: `rt-${Date.now()}-${idCounter.current}`,
                icon: "🐙",
                text: `Pieuvre DG : ${(c.user_message ?? "").slice(0, 60)}…`,
                type: "conversation" as const,
                ts: new Date(),
              },
              ...prev,
            ].slice(0, maxItems)
          );
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [maxItems]);

  return (
    <GlassCard className="h-full">
      <div className="flex items-center justify-between mb-lg">
        <Eyebrow variant="cyan">Realtime activity</Eyebrow>
        <span className="flex items-center gap-xs">
          <span className={connected ? "pulse-dot" : "w-2 h-2 rounded-full bg-warning"} />
          <span className="text-micro uppercase tracking-wider text-cyan-electric">
            {connected ? "Live" : "Connecting"}
          </span>
        </span>
      </div>
      <div className="space-y-xs max-h-96 overflow-y-auto scrollbar-thin">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-start gap-sm py-xs border-b border-glass-border/30 last:border-0 animate-fade-in-down"
          >
            <div className="text-h3">{event.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-caption text-text-primary truncate">{event.text}</div>
              <div className="text-micro text-text-tertiary">{formatDateRelative(event.ts)}</div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <p className="text-caption text-text-tertiary text-center py-md">
            En attente d&apos;activité…
          </p>
        )}
      </div>
    </GlassCard>
  );
}
