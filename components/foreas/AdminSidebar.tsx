"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Target,
  Users,
  Handshake,
  Wallet,
  Octagon,
  MessageCircle,
  Shield,
  Server,
  Lock,
  BarChart3,
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
  badge?: string;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/acquisition", label: "Acquisition & Funnel", icon: Target },
  { href: "/admin/chauffeurs", label: "Chauffeurs", icon: Users },
  { href: "/admin/partenaires", label: "Partenaires", icon: Handshake },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/pieuvre", label: "Pieuvre & IA", icon: Octagon, badge: "live" },
  { href: "/admin/communaute", label: "Communauté", icon: MessageCircle },
  { href: "/admin/moderation", label: "Modération", icon: Shield },
  { href: "/admin/stack", label: "Stack & Monitoring", icon: Server },
  { href: "/admin/securite", label: "Sécurité & Fraude", icon: Lock },
  { href: "/admin/reports", label: "Reports & Exports", icon: BarChart3 },
];

interface AdminSidebarProps {
  adminName?: string;
  adminEmail?: string;
}

export function AdminSidebar({
  adminName = "Admin",
  adminEmail = "admin@foreas.xyz",
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-obsidian-deep border-r border-glass-border sticky top-0 shrink-0">
      <div className="px-xl py-xxl">
        <div className="flex items-baseline gap-xs">
          <span className="text-h1 font-extrabold text-text-hero tracking-tight">FOREAS</span>
          <span className="text-h3 font-light text-violet-royal">/</span>
        </div>
        <div className="mt-xs">
          <span className="eyebrow">Admin Console</span>
        </div>
      </div>

      <div className="mx-lg mb-lg p-md rounded-lg bg-gradient-card border border-violet-royal/30">
        <div className="text-caption text-text-tertiary">Connecté</div>
        <div className="text-body-bold text-text-primary mt-xxs">{adminName}</div>
        <div className="mt-xs flex items-center gap-xs">
          <span className="pulse-dot" />
          <span className="font-mono text-micro text-violet-royal truncate">{adminEmail}</span>
        </div>
      </div>

      <nav className="flex-1 px-md space-y-xxs overflow-y-auto scrollbar-thin">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-item", isActive && "sidebar-item-active")}
            >
              <Icon size={18} />
              <span className="text-body-bold flex-1">{item.label}</span>
              {item.badge && (
                <span className="px-xs py-xxs text-micro font-bold bg-success/20 text-success rounded-pill animate-pulse-soft">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

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
