"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sparkles,
  Map,
  Briefcase,
  Wallet,
  FileText,
  Users,
  LogOut,
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
}

const DRIVER_NAV: NavItem[] = [
  { href: "/driver", label: "Mon dashboard", icon: LayoutDashboard },
  { href: "/driver/coach", label: "Coach Ajnaya", icon: Sparkles },
  { href: "/driver/heatmap", label: "Zones live", icon: Map },
  { href: "/driver/clients-prives", label: "Clients privés", icon: Briefcase },
  { href: "/driver/paie", label: "Mes fiches de paie", icon: FileText },
  { href: "/driver/parrainage", label: "Parrainage", icon: Users },
];

interface DriverSidebarProps {
  driverName?: string;
  referralCode?: string;
}

export function DriverSidebar({
  driverName = "Chauffeur",
  referralCode = "FOREAS",
}: DriverSidebarProps) {
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
        <ForeasDivider className="mt-sm mb-xs" opacity={0.45} />
        <span className="eyebrow">Espace Chauffeur</span>
      </div>

      <div className="mx-lg mb-lg p-md rounded-lg bg-glass-low border border-glass-border">
        <div className="text-caption text-text-tertiary">Chauffeur</div>
        <div className="text-body-bold text-text-primary mt-xxs">{driverName}</div>
        <div className="mt-xs flex items-center gap-xs">
          <span className="pulse-dot" />
          <span className="font-mono text-caption text-violet-royal">{referralCode}</span>
        </div>
      </div>

      <nav className="flex-1 px-md space-y-xxs overflow-y-auto scrollbar-thin">
        {DRIVER_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/driver" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("sidebar-item", isActive && "sidebar-item-active")}
            >
              <Icon size={18} />
              <span className="text-body-bold flex-1">{item.label}</span>
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
