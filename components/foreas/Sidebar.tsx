"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Search,
  Briefcase,
  Wallet,
  User,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

const PARTNER_NAV: NavItem[] = [
  { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partner/chauffeurs", label: "Chauffeurs", icon: Users },
  { href: "/partner/recrutement", label: "Recrutement", icon: Search },
  { href: "/partner/clients-b2b", label: "Clients B2B", icon: Briefcase },
  { href: "/partner/commissions", label: "Commissions", icon: Wallet },
  { href: "/partner/profil", label: "Profil", icon: User },
];

interface SidebarProps {
  partnerCode?: string;
  partnerName?: string;
}

export function Sidebar({ partnerCode = "PARIS18-DJ", partnerName = "Driss J." }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-obsidian-deep border-r border-glass-border sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-xl py-xxl">
        <div className="flex items-baseline gap-xs">
          <span className="text-h1 font-extrabold text-text-hero tracking-tight">FOREAS</span>
          <span className="text-h3 font-light text-violet-royal">/</span>
        </div>
        <div className="mt-xs">
          <span className="eyebrow">Espace Directeur</span>
        </div>
      </div>

      {/* Partner identity */}
      <div className="mx-lg mb-lg p-md rounded-lg bg-glass-low border border-glass-border">
        <div className="text-caption text-text-tertiary">Partenaire</div>
        <div className="text-body-bold text-text-primary mt-xxs">{partnerName}</div>
        <div className="mt-xs flex items-center gap-xs">
          <span className="pulse-dot" />
          <span className="font-mono text-caption text-violet-royal">{partnerCode}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-md space-y-xxs overflow-y-auto scrollbar-thin">
        {PARTNER_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/partner" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )}
            >
              <Icon size={18} />
              <span className="text-body-bold flex-1">{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-xs py-xxs text-micro font-bold bg-violet-royal/20 text-violet-royal rounded-pill">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-md pb-xl pt-lg border-t border-glass-border">
        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-text-tertiary hover:text-danger"
        >
          <LogOut size={18} />
          <span className="text-body-bold">Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
