"use client";

import { GlassCard } from "./GlassCard";
import { StatusPill } from "./StatusPill";
import { cn, formatEUR, formatDateRelative, getInitials, type DriverStatus } from "@/lib/utils";
import { useState } from "react";
import { Search, MoreVertical, ArrowUpDown } from "lucide-react";

export interface FleetDriver {
  id: string;
  name: string;
  status: DriverStatus;
  weeklyCA: number;
  monthlyCA: number;
  lastRideAt: Date | null;
  referralCode?: string;
}

interface FleetTableProps {
  drivers: FleetDriver[];
  onRowClick?: (driver: FleetDriver) => void;
}

// Fallback stub si aucune donnée Supabase encore (V0 demo)
const STUB_DRIVERS: FleetDriver[] = [
  { id: "1", name: "Karim Boujemaa", status: "active", weeklyCA: 820, monthlyCA: 3280, lastRideAt: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: "2", name: "Mehdi Kacem", status: "warning", weeklyCA: 420, monthlyCA: 2100, lastRideAt: new Date(Date.now() - 1000 * 60 * 60 * 36) },
  { id: "3", name: "Driss Jacquet", status: "alert", weeklyCA: 0, monthlyCA: 1200, lastRideAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28) },
  { id: "4", name: "Leila Bensalem", status: "active", weeklyCA: 1150, monthlyCA: 4400, lastRideAt: new Date(Date.now() - 1000 * 60 * 30) },
  { id: "5", name: "Yann Tritter", status: "alert", weeklyCA: 180, monthlyCA: 950, lastRideAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6) },
  { id: "6", name: "Sofiane Amri", status: "active", weeklyCA: 760, monthlyCA: 3050, lastRideAt: new Date(Date.now() - 1000 * 60 * 60 * 4) },
  { id: "7", name: "Anaïs Petit", status: "active", weeklyCA: 690, monthlyCA: 2780, lastRideAt: new Date(Date.now() - 1000 * 60 * 60 * 8) },
  { id: "8", name: "Rachid Tahiri", status: "inactive", weeklyCA: 0, monthlyCA: 0, lastRideAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 65) },
];

type FilterType = "all" | "active" | "alert" | "inactive";

const filterLabels: Record<FilterType, string> = {
  all: "Tous",
  active: "Actifs",
  alert: "Alerte",
  inactive: "Inactifs",
};

export function FleetTable({ drivers, onRowClick }: FleetTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const dataSource = drivers && drivers.length > 0 ? drivers : STUB_DRIVERS;

  const filtered = dataSource.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "active" && d.status === "active") ||
      (filter === "alert" && (d.status === "alert" || d.status === "warning")) ||
      (filter === "inactive" && d.status === "inactive");
    return matchSearch && matchFilter;
  });

  return (
    <GlassCard>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-md mb-lg">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-md top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Rechercher un chauffeur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-9 pr-md py-sm rounded-lg",
              "bg-glass-low border border-glass-border",
              "text-body text-text-primary placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-violet-royal/50 focus:border-violet-royal/50",
              "transition-all"
            )}
          />
        </div>

        <div className="flex gap-xs flex-wrap">
          {(Object.keys(filterLabels) as FilterType[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-md py-sm rounded-lg text-caption font-semibold border transition-all",
                filter === f
                  ? "bg-violet-royal/15 text-violet-royal border-violet-royal/40"
                  : "bg-glass-low text-text-secondary border-glass-border hover:text-text-primary hover:border-glass-border-high"
              )}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin -mx-xl px-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-glass-border">
              <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Chauffeur</th>
              <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Statut</th>
              <th className="text-right py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">
                <div className="inline-flex items-center gap-xxs">
                  CA semaine <ArrowUpDown size={10} />
                </div>
              </th>
              <th className="text-right py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">CA mois</th>
              <th className="text-left py-sm px-md text-micro uppercase tracking-wider text-text-tertiary font-bold">Dernière course</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((driver) => (
              <tr
                key={driver.id}
                onClick={() => onRowClick?.(driver)}
                className="border-b border-glass-border/50 hover:bg-violet-royal/5 transition-colors cursor-pointer group"
              >
                <td className="py-md px-md">
                  <div className="flex items-center gap-md">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-royal font-bold text-white text-caption">
                      {getInitials(driver.name)}
                    </div>
                    <div>
                      <div className="text-body-bold text-text-primary">{driver.name}</div>
                      <div className="text-micro text-text-tertiary font-mono">
                        {driver.referralCode ?? `FOREAS-${driver.id.slice(0, 6).toUpperCase()}`}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-md px-md">
                  <StatusPill status={driver.status} pulsing={driver.status === "alert"} />
                </td>
                <td className="py-md px-md text-right">
                  <div className={cn(
                    "text-body-bold tabular-nums",
                    driver.weeklyCA === 0 ? "text-text-tertiary" : "text-text-primary"
                  )}>
                    {formatEUR(driver.weeklyCA)}
                  </div>
                </td>
                <td className="py-md px-md text-right">
                  <div className="text-body tabular-nums text-text-secondary">
                    {formatEUR(driver.monthlyCA)}
                  </div>
                </td>
                <td className="py-md px-md">
                  <div className="text-caption text-text-tertiary">
                    {driver.lastRideAt ? formatDateRelative(driver.lastRideAt) : "Aucune course"}
                  </div>
                </td>
                <td className="py-md px-md">
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 flex h-8 w-8 items-center justify-center rounded-md bg-glass-low text-text-tertiary hover:text-text-primary transition-all"
                    aria-label="Actions"
                  >
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-huge text-center">
                  <div className="text-text-tertiary">
                    Aucun chauffeur ne correspond à ces filtres.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-lg flex items-center justify-between text-caption text-text-tertiary">
        <span>{filtered.length} chauffeur{filtered.length > 1 ? "s" : ""} affiché{filtered.length > 1 ? "s" : ""}</span>
        <span className="flex items-center gap-xs">
          <span className="pulse-dot" />
          Synchro temps réel
        </span>
      </div>
    </GlassCard>
  );
}
