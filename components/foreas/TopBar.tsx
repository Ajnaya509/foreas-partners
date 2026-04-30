"use client";

import { Bell, Menu, Search } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

interface TopBarProps {
  partnerName?: string;
  notificationsCount?: number;
  onMenuClick?: () => void;
}

export function TopBar({ partnerName = "Driss J.", notificationsCount = 0, onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-lg px-xl py-md border-b border-glass-border bg-obsidian/80 backdrop-blur-xl">
      {/* Mobile menu toggle */}
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-glass-low border border-glass-border text-text-secondary hover:text-text-primary"
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>

      {/* Search (placeholder, command palette futur) */}
      <div className="hidden md:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search
            size={16}
            className="absolute left-md top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="Rechercher un chauffeur, un contrat… (⌘K)"
            className={cn(
              "w-full pl-9 pr-md py-xs rounded-lg",
              "bg-glass-low border border-glass-border",
              "text-body text-text-primary placeholder:text-text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-violet-royal/50 focus:border-violet-royal/50",
              "transition-all"
            )}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-glass-low border border-glass-border text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {notificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white px-1">
              {notificationsCount > 9 ? "9+" : notificationsCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-royal font-bold text-white text-body-bold shrink-0">
          {getInitials(partnerName)}
        </div>
      </div>
    </header>
  );
}
