import { AppLayout } from "@/components/AppLayout";
import { ModuleCard } from "@/components/ModuleCard";
import { 
  Users, 
  FileText, 
  File, 
  LayoutGrid, 
  Utensils, 
  ListTodo, 
  Image,
  CreditCard,
  ClipboardList,
  Building2,
  UserCircle,
  MapPin
} from "lucide-react";

const modules = [
  { title: "Guest List", count: 78, icon: Users, color: "bg-module-calendar", href: "/guests" },
  { title: "RV & Camping", count: 12, icon: ClipboardList, color: "bg-status-warning", href: "/camping" },
  { title: "Contracts", count: 1, icon: FileText, color: "bg-status-success", href: "/contracts" },
  { title: "Documents", count: 4, icon: File, color: "bg-module-files", href: "/documents" },
  { title: "Floor Plan", count: 1, icon: LayoutGrid, color: "bg-status-warning", href: "/floorplan" },
  { title: "Vendors", count: 5, icon: Utensils, color: "bg-status-success", href: "/vendors" },
  { title: "Weekend Timeline", count: 8, icon: ListTodo, color: "bg-status-danger", href: "/timeline" },
  { title: "Payments", count: 3, icon: CreditCard, color: "bg-status-warning", href: "/payments", badge: { text: "1 payment due soon", variant: "danger" as const } },
  { title: "Planning Checklist", count: 24, icon: ClipboardList, color: "bg-status-purple", href: "/checklist", badge: { text: "4 items due this month", variant: "warning" as const } },
  { title: "To-Do's", count: 14, icon: ListTodo, color: "bg-status-success", href: "/todos", badge: { text: "6 overdue / 3 upcoming", variant: "warning" as const } },
  { title: "Photo Share", count: 2, icon: Image, color: "bg-status-success", href: "/photos" },
];

const quickLinks = [
  { title: "Payment Schedule", icon: CreditCard, href: "/payments" },
  { title: "Couple Profile", icon: UserCircle, href: "/profile" },
  { title: "Preferred Vendors", icon: Building2, href: "/vendors" },
  { title: "Venue Guide", icon: MapPin, href: "/venue-guide" },
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
