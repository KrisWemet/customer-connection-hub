import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { KanbanColumn } from "@/components/KanbanColumn";
import { LeadCardData } from "@/components/LeadCard";
import { 
  UserPlus, 
  X, 
  Trophy, 
  FolderOpen, 
  Clock,
  Search,
  Filter,
  Grid3X3,
  List
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusCards = [
  { title: "New Inquiries", count: 3, icon: UserPlus, color: "bg-module-calendar", subtitle: "last 30 days ▾" },
  { title: "Declined", count: 1, icon: X, color: "bg-status-warning", subtitle: "last 90 days ▾", subtitleText: "Closed" },
  { title: "Booked", count: 2, icon: Trophy, color: "bg-status-warning", subtitle: "last 180 days ▾", subtitleText: "Confirmed" },
  { title: "Open", count: 4, icon: FolderOpen, color: "bg-primary", subtitle: "View" },
  { title: "Holds", count: 1, icon: Clock, color: "bg-status-warning", subtitle: "View" },
];

const filterTags = ["Open + Holds", "All Event Dates", "New Inquiries"];

const quickViews = [
  "All",
  "Open + Holds",
  "Tours Scheduled",
  "Contract Sent",
  "Booked",
  "Declined",
  "Next 30 Days",
];

const columns: { title: string; leads: LeadCardData[] }[] = [
  {
    title: "Inquiry",
    leads: [
      {
        id: "1",
        title: "Harper + Luca Wedding",
        date: "06/13/2026",
        time: "Weekend Package (3-Day)",
        status: "open",
        daysOld: 2,
        daysInStep: 1,
        contacts: ["Harper Miles", "Luca Ortiz"],
      },
    ],
  },
  {
    title: "Tour/Call Scheduled",
    leads: [
      {
        id: "2",
        title: "Bennett + Rivers",
        date: "08/22/2026",
        time: "Site Tour • Jan 29, 2026",
        status: "open",
        daysOld: 5,
        daysInStep: 2,
        contacts: ["Morgan Bennett", "Quinn Rivers"],
        tags: [
          { label: "3-Day Package", color: "#3B82F6" },
          { label: "80 Guests", color: "#22C55E" },
          { label: "Camping Add-On", color: "#EF4444" },
        ],
      },
    ],
  },
  {
    title: "Approved",
    leads: [
      {
        id: "3",
        title: "Nguyen + Patel",
        date: "05/02/2026",
        time: "2-Day Package (Tue-Wed)",
        status: "hold",
        daysOld: 12,
        daysInStep: 4,
        contacts: ["Avery Nguyen", "Sam Patel"],
      },
    ],
  },
  {
    title: "Contract Sent",
    leads: [
      {
        id: "4",
        title: "Owens + Clarke",
        date: "09/18/2026",
        time: "5-Day Package (Thu-Tue)",
        status: "open",
        daysOld: 18,
        daysInStep: 6,
        contacts: ["Jules Owens", "Casey Clarke"],
      },
    ],
  },
  {
    title: "Contract Signed",
    leads: [],
  },
  {
    title: "Booking Confirmed",
    leads: [],
  },
  {
    title: "Pre-Event Checklist",
    leads: [],
  },
  {
    title: "Event Week",
    leads: [],
  },
  {
    title: "Post-Event Inspection",
    leads: [],
  },
];

export default function Leads() {
  const [activeQuickView, setActiveQuickView] = useState<string>("Open + Holds");
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const now = new Date();

  const filteredColumns = columns
    .filter((column) => {
      if (activeQuickView === "Tours Scheduled") return column.title === "Tour/Call Scheduled";
      if (activeQuickView === "Contract Sent") return column.title === "Contract Sent";
      if (activeQuickView === "Booked") return column.title === "Booking Confirmed";
      if (activeQuickView === "Declined") return column.title === "Declined";
      return true;
    })
    .map((column) => {
      const filteredLeads = column.leads.filter((lead) => {
        if (activeQuickView === "Open + Holds" && !["open", "hold"].includes(lead.status)) {
          return false;
        }
        if (activeQuickView === "Next 30 Days") {
          const [month, day, year] = lead.date.split("/").map(Number);
          if (!month || !day || !year) return false;
          const date = new Date(year, month - 1, day);
          const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays < 0 || diffDays > 30) return false;
        }
        if (normalizedSearch) {
          const haystack = [
            lead.title,
            lead.date,
            lead.time,
            ...lead.contacts,
            ...(lead.tags?.map((tag) => tag.label) ?? []),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(normalizedSearch);
        }
        return true;
      });
      return { ...column, leads: filteredLeads };
    });

  return (
    <AppLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <a href="/" className="hover:text-primary">Home</a>
          <span>//</span>
          <span>Inquiries</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-primary">Inquiries</h1>
          <a href="#" className="text-sm text-primary hover:underline flex items-center gap-1">
            📋 Inquiry Timeline
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-6">
          <button className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Add Inquiry
          </button>
          <button className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
            Setup ▾
          </button>
          <div className="flex-1" />
          <div className="relative">
            <input
              type="text"
              placeholder="Begin typing to filter current view..."
              className="w-72 px-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
            Advanced Search ▾
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {statusCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-card rounded-xl p-4 border border-border/50 shadow-card flex items-center gap-4 animate-fade-in"
            >
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", card.color)}>
                <card.icon size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-foreground">{card.title}</span>
                  {card.subtitleText && (
                    <span className="text-xs text-muted-foreground">({card.subtitleText})</span>
                  )}
                  <span className="text-lg font-bold text-foreground">{card.count}</span>
                </div>
                <p className="text-xs text-primary">{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Quick Views */}
        <div className="flex gap-6 mb-6">
          {/* Quick Views Sidebar */}
          <div className="w-48 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Quick Views</h3>
              <Search size={16} className="text-muted-foreground" />
            </div>
            <div className="space-y-1">
              {quickViews.map((view, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveQuickView(view)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    activeQuickView === view
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Filter size={12} className="inline mr-2" />
                  {view}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Filter Tags */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-muted-foreground">FILTERING BY:</span>
              {filterTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <button className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <Filter size={16} className="text-muted-foreground" />
                </button>
                <button className="p-2 bg-primary/10 rounded-lg">
                  <Grid3X3 size={16} className="text-primary" />
                </button>
                <button className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <List size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
              {filteredColumns.map((column, idx) => (
                <KanbanColumn
                  key={idx}
                  title={column.title}
                  count={column.leads.length}
                  leads={column.leads}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
