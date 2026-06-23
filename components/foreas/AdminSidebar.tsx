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
  Network,
  Coins,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ForeasLogo } from "@/components/foreas/ForeasLogo";
import { ForeasDivider } from "@/components/foreas/ForeasDivider";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: "success" | "warning" | "cyan";
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/acquisition", label: "Acquisition & Funnel", icon: Target },
  { href: "/admin/chauffeurs", label: "Chauffeurs", icon: Users },
  // ── MLM Partners ──
  { href: "/admin/partners", label: "Partners MLM", icon: Network, badge: "live", badgeColor: "cyan" },
  { href: "/admin/partner-pending", label: "Candidatures", icon: UserPlus, badge: "valider", badgeColor: "warning" },
  { href: "/admin/payouts", label: "Payouts MLM", icon: Coins },
  // ── Legacy + Finance ──
  { href: "/admin/partenaires", label: "Partenaires (legacy)", icon: Handshake },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/pieuvre", label: "Pieuvre & IA", icon: Octagon, badge: "live", badgeColor: "success" },
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
      <div className="px-xl pt-xxl pb-md">
        <ForeasLogo variant="full" color="#F8FAFC" height={22} />
        <ForeasDivider className="mt-sm mb-xs" opacity={0.5} />
        <span className="text-eyebrow uppercase tracking-widest text-cyan-electric/80 font-bold text-[10px]">
          Admin Console
        </span>
      </div>

      {/* Admin identity card — cyan variant */}
      <div className="mx-lg mb-lg p-md rounded-lg border border-cyan-electric/20"
           style={{ background: "linear-gradient(135deg, rgba(0,212,255,0.08) 0%, rgba(140,82,255,0.05) 100%)" }}>
        <div className="text-caption text-text-tertiary">Connecté en tant qu'admin</div>
        <div className="text-body-bold text-text-primary mt-xxs">{adminName}</div>
        <div className="mt-xs flex items-center gap-xs">
          <span className="pulse-dot" />
          <span className="font-mono text-micro text-cyan-electric truncate">{adminEmail}</span>
        </div>
      </div>

      <nav className="flex-1 px-md space-y-xxs overflow-y-auto scrollbar-thin">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));
          const badgeColorClass =
            item.badgeColor === "cyan"
              ? "bg-cyan-electric/15 text-cyan-electric"
              : item.badgeColor === "warning"
              ? "bg-warning/15 text-warning"
              : "bg-success/15 text-success";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active-admin"
              )}
            >
              <Icon size={18} />
              <span className="text-body-bold flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className={cn(
                    "px-xs py-xxs text-micro font-bold rounded-pill",
                    badgeColorClass
                  )}
                >
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
