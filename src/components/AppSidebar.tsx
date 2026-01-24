import { cn } from "@/lib/utils";
import { getThreads } from "@/lib/messaging/service";
import { supabaseConfigured } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  Calendar,
  CalendarDays,
  Users,
  Mail,
  Target,
  FileText,
  DollarSign,
  FileSignature,
  BarChart3,
  LayoutTemplate,
  UserCircle,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Inquiries", href: "/leads", icon: Target },
  { name: "Tours", href: "/tours", icon: CalendarDays },
  { name: "Bookings", href: "/events", icon: Calendar },
  { name: "Calendar", href: "/calendars", icon: Calendar },
  { name: "Messages", href: "/messages", icon: Mail },
  { name: "Couples & Vendors", href: "/contacts", icon: Users },
  { name: "Packages", href: "/proposals", icon: FileText },
  { name: "Payments", href: "/invoices", icon: DollarSign },
  { name: "Damage Deposits", href: "/damage-deposits", icon: ShieldCheck, adminOnly: true },
  { name: "Contracts", href: "/contracts", icon: FileSignature },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  { name: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
  { name: "Client Portal", href: "/portal", icon: UserCircle },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { data: threads = [] } = useQuery({
    queryKey: ["message_threads"],
    queryFn: async () => {
      if (!supabaseConfigured) return [];
      return getThreads();
    },
    refetchInterval: 20000,
  });
  const unreadCount = threads.reduce((sum, thread) => sum + (thread.unread_count ?? 0), 0);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <span className="text-xl font-bold text-sidebar-foreground italic">
              Rustic Retreat
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* User Profile */}
        <div className={cn(
          "flex items-center gap-3 px-4 py-4 border-b border-sidebar-border",
          collapsed && "justify-center"
        )}>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
            SR
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                Shannon Ouimet
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate">
                Owner / Admin
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {navigationItems.map((item) => {
              // TODO: wire to real auth role; currently all users see items marked adminOnly.
              if (item.adminOnly) {
                // Placeholder for future role check
              }
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <item.icon size={20} className="shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                    {item.name === "Messages" && unreadCount > 0 && (
                      <span
                        className={cn(
                          "ml-auto inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground",
                          collapsed && "absolute right-2 top-2 ml-0 h-2 w-2 min-w-0 p-0 text-[0px]"
                        )}
                      >
                        {collapsed ? "." : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
