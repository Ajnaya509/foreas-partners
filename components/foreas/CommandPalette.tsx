"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Wallet,
  Sparkles,
  Map,
  FileText,
  User,
  Search as SearchIcon,
  Octagon,
  Server,
  Handshake,
  Target,
  Lock,
  BarChart3,
  Shield,
  MessageCircle,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  href: string;
  icon: React.ReactNode;
  group: "Driver" | "Partner" | "Admin" | "Actions";
}

const COMMANDS: CommandItem[] = [
  // Driver
  { id: "driver", label: "Mon dashboard chauffeur", href: "/driver", icon: <LayoutDashboard size={16} />, group: "Driver" },
  { id: "driver-coach", label: "Coach Ajnaya", href: "/driver/coach", icon: <Sparkles size={16} />, group: "Driver" },
  { id: "driver-heatmap", label: "Zones live", href: "/driver/heatmap", icon: <Map size={16} />, group: "Driver" },
  { id: "driver-clients", label: "Clients privés (VIP)", href: "/driver/clients-prives", icon: <Briefcase size={16} />, group: "Driver" },
  { id: "driver-paie", label: "Mes fiches de paie", href: "/driver/paie", icon: <FileText size={16} />, group: "Driver" },
  { id: "driver-parrainage", label: "Parrainage MLM", href: "/driver/parrainage", icon: <Users size={16} />, group: "Driver" },

  // Partner
  { id: "partner", label: "Dashboard directeur", href: "/partner", icon: <LayoutDashboard size={16} />, group: "Partner" },
  { id: "partner-chauffeurs", label: "Mes chauffeurs", href: "/partner/chauffeurs", icon: <Users size={16} />, group: "Partner" },
  { id: "partner-recrutement", label: "Recrutement", href: "/partner/recrutement", icon: <Target size={16} />, group: "Partner" },
  { id: "partner-b2b", label: "Clients B2B", href: "/partner/clients-b2b", icon: <Briefcase size={16} />, group: "Partner" },
  { id: "partner-commissions", label: "Mes commissions", href: "/partner/commissions", icon: <Wallet size={16} />, group: "Partner" },
  { id: "partner-profil", label: "Profil partenaire", href: "/partner/profil", icon: <User size={16} />, group: "Partner" },

  // Admin
  { id: "admin", label: "Vue d'ensemble admin", href: "/admin", icon: <LayoutDashboard size={16} />, group: "Admin" },
  { id: "admin-acquisition", label: "Acquisition & Funnel", href: "/admin/acquisition", icon: <Target size={16} />, group: "Admin" },
  { id: "admin-chauffeurs", label: "Tous les chauffeurs", href: "/admin/chauffeurs", icon: <Users size={16} />, group: "Admin" },
  { id: "admin-partenaires", label: "Tous les partenaires", href: "/admin/partenaires", icon: <Handshake size={16} />, group: "Admin" },
  { id: "admin-finance", label: "Finance & MRR", href: "/admin/finance", icon: <Wallet size={16} />, group: "Admin" },
  { id: "admin-pieuvre", label: "Pieuvre & IA", href: "/admin/pieuvre", icon: <Octagon size={16} />, group: "Admin" },
  { id: "admin-communaute", label: "Communauté", href: "/admin/communaute", icon: <MessageCircle size={16} />, group: "Admin" },
  { id: "admin-moderation", label: "Modération", href: "/admin/moderation", icon: <Shield size={16} />, group: "Admin" },
  { id: "admin-stack", label: "Stack & Monitoring", href: "/admin/stack", icon: <Server size={16} />, group: "Admin" },
  { id: "admin-securite", label: "Sécurité & Fraude", href: "/admin/securite", icon: <Lock size={16} />, group: "Admin" },
  { id: "admin-reports", label: "Reports & Exports", href: "/admin/reports", icon: <BarChart3 size={16} />, group: "Admin" },
];

const GROUPS: Array<CommandItem["group"]> = ["Actions", "Driver", "Partner", "Admin"];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-md animate-fade-in-down"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-obsidian-deep/80 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl glass-card-elevated overflow-hidden"
      >
        <Command label="Command Menu" shouldFilter>
          <div className="flex items-center gap-sm px-lg py-md border-b border-glass-border">
            <SearchIcon size={18} className="text-text-tertiary" />
            <Command.Input
              placeholder="Chercher une page, une action…"
              className="flex-1 bg-transparent text-body-lg text-text-primary placeholder:text-text-tertiary outline-none"
            />
            <kbd className="text-micro font-mono text-text-tertiary border border-glass-border rounded px-xs py-xxs">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto scrollbar-thin py-sm">
            <Command.Empty className="py-md px-lg text-caption text-text-tertiary">
              Aucun résultat.
            </Command.Empty>

            {GROUPS.map((group) => {
              const items = COMMANDS.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group
                  key={group}
                  heading={
                    <div className="px-lg py-xs text-micro uppercase tracking-wider text-text-tertiary font-bold">
                      {group}
                    </div>
                  }
                >
                  {items.map((item) => (
                    <Command.Item
                      key={item.id}
                      onSelect={() => onSelect(item.href)}
                      className="flex items-center gap-md px-lg py-sm cursor-pointer text-body text-text-secondary hover:bg-violet-royal/10 hover:text-text-primary aria-selected:bg-violet-royal/15 aria-selected:text-text-primary"
                    >
                      <span className="text-violet-royal">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      {item.hint && (
                        <span className="text-micro text-text-tertiary">{item.hint}</span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              );
            })}
          </Command.List>

          <div className="border-t border-glass-border px-lg py-xs flex items-center justify-between text-micro text-text-tertiary">
            <span>Recherche FOREAS Dashboard</span>
            <span className="flex items-center gap-xs">
              <kbd className="font-mono border border-glass-border rounded px-xxs">⌘K</kbd>
              <span>pour ouvrir</span>
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
