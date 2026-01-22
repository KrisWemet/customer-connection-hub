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
  { title: "Attendee List", count: 1, icon: Users, color: "bg-module-calendar", href: "/attendees" },
  { title: "Banquet Event Order (BEO)", count: 1, icon: ClipboardList, color: "bg-status-warning", href: "/beo" },
  { title: "Contracts", count: 0, icon: FileText, color: "bg-status-success", href: "/contracts" },
  { title: "Files", count: 2, icon: File, color: "bg-module-files", href: "/files" },
  { title: "Floorplan", count: 1, icon: LayoutGrid, color: "bg-status-warning", href: "/floorplan" },
  { title: "Food & Beverage", count: 1, icon: Utensils, color: "bg-status-success", href: "/food-beverage" },
  { title: "Itinerary", count: 1, icon: ListTodo, color: "bg-status-danger", href: "/itinerary" },
  { title: "Proposals & Invoices", count: 2, icon: FileText, color: "bg-status-warning", href: "/proposals", badge: { text: "2 items require attention", variant: "danger" as const } },
  { title: "Questionnaire", count: 1, icon: ClipboardList, color: "bg-status-purple", href: "/questionnaire", badge: { text: "1 item requires attention", variant: "danger" as const } },
  { title: "To-Do's", count: 29, icon: ListTodo, color: "bg-status-success", href: "/todos", badge: { text: "20 overdue / 4 upcoming", variant: "warning" as const } },
  { title: "Vision Board", count: 1, icon: Image, color: "bg-status-success", href: "/vision-board" },
];

const quickLinks = [
  { title: "My Payment Methods", icon: CreditCard, href: "/payments" },
  { title: "Contacts", icon: UserCircle, href: "/contacts" },
  { title: "Vendors", icon: Building2, href: "/vendors" },
  { title: "Venues", icon: MapPin, href: "/venues" },
];

export default function ClientPortal() {
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-status-danger italic">
            Welcome to your Client Portal!
          </h1>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">FISHER</p>
            <p className="text-sm text-muted-foreground">GARDEN HOTEL</p>
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
