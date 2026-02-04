import { AppLayout } from "@/components/AppLayout";
import { ModuleCard } from "@/components/ModuleCard";
import {
  Users,
  FileText,
  File,
  ListTodo,
  CreditCard,
  ClipboardList,
} from "lucide-react";

const modules = [
  { title: "Payments", count: 3, icon: CreditCard, color: "bg-status-warning", href: "/payments", badge: { text: "1 payment due soon", variant: "danger" as const } },
  { title: "Contracts", count: 1, icon: FileText, color: "bg-status-success", href: "/contracts" },
  { title: "Documents", count: 4, icon: File, color: "bg-module-files", href: "/documents" },
  { title: "Guest List", count: 78, icon: Users, color: "bg-module-calendar", href: "/guests" },
  { title: "Weekend Timeline", count: 8, icon: ListTodo, color: "bg-status-danger", href: "/timeline" },
  { title: "Planning Checklist", count: 24, icon: ClipboardList, color: "bg-status-purple", href: "/checklist", badge: { text: "4 items due this month", variant: "warning" as const } },
  { title: "To-Do's", count: 14, icon: ListTodo, color: "bg-status-success", href: "/todos", badge: { text: "6 overdue / 3 upcoming", variant: "warning" as const } },
];

const quickLinks = [
  { title: "Payment Schedule", icon: CreditCard, href: "/payments" },
  { title: "Contracts", icon: FileText, href: "/contracts" },
  { title: "Documents", icon: File, href: "/documents" },
  { title: "Timeline", icon: ListTodo, href: "/timeline" },
];

export default function ClientPortal() {
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-status-danger italic">
            Welcome to Rustic Retreat!
          </h1>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">MORGAN + TAYLOR</p>
            <p className="text-sm text-muted-foreground">September 19, 2026</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Quick Links Sidebar */}
          <div className="col-span-12 md:col-span-3">
            <div className="bg-card rounded-xl border border-border/50 shadow-card overflow-hidden">
              {quickLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-muted transition-colors border-b border-border/50 last:border-b-0"
                >
                  <link.icon size={18} />
                  <span>{link.title}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Module Cards Grid */}
          <div className="col-span-12 md:col-span-9">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module, idx) => (
                <ModuleCard
                  key={idx}
                  title={module.title}
                  count={module.count}
                  icon={module.icon}
                  iconColor={module.color}
                  href={module.href}
                  badge={module.badge}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
