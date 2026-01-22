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
  { title: "Captured", count: 1, icon: UserPlus, color: "bg-module-calendar", subtitle: "past 60 days ▾" },
  { title: "Lost", count: 0, icon: X, color: "bg-status-warning", subtitle: "(Closed) past 3 days ▾", subtitleText: "Closed" },
  { title: "Won", count: 0, icon: Trophy, color: "bg-status-warning", subtitle: "(Booked) past 60 days ▾", subtitleText: "Booked" },
  { title: "Open", count: 3, icon: FolderOpen, color: "bg-primary", subtitle: "View" },
  { title: "Holds", count: 1, icon: Clock, color: "bg-status-warning", subtitle: "View" },
];

const filterTags = ["Open + Holds", "All Event Dates", "All Captured"];

const quickViews = [
  "All",
  "Open + Holds",
  "Open",
  "Holds",
  "Lost (Closed)",
  "Captured",
  "Next 7 Days",
];

const columns: { title: string; leads: LeadCardData[] }[] = [
  {
    title: "New Lead",
    leads: [
      {
        id: "1",
        title: "Scarborough Reception",
        date: "10/01/2021",
        time: "2:00 PM - 10:00 PM",
        status: "open",
        daysOld: 391,
        daysInStep: 0,
        contacts: ["Josh Scarborough", "Aaron Adams", "Cindy Ang (The Ranch at Evergreen)"],
      },
    ],
  },
  {
    title: "First Contact",
    leads: [
      {
        id: "2",
        title: "Launch Party @ Arts Center",
        date: "10/19/2018",
        time: "6:00 PM - 10:30 PM",
        status: "open",
        daysOld: 1818,
        daysInStep: 0,
        contacts: ["Miranda Pope (Mirra Group Ventures)", "Jane Babbit", "Janice Doerty", "Erica Blake", "Laura Finch"],
        tags: [
          { label: "Brand/Product Launch", color: "#3B82F6" },
          { label: "Fundraiser", color: "#22C55E" },
          { label: "Gala/Celebration", color: "#EF4444" },
        ],
      },
    ],
  },
  {
    title: "Lead Qualified",
    leads: [
      {
        id: "3",
        title: "Morris Industries Open House",
        date: "09/13/2018",
        time: "2:00 PM - 9:30 PM",
        status: "hold",
        daysOld: 1423,
        daysInStep: 0,
        contacts: [],
      },
    ],
  },
  {
    title: "Appointment/Call Scheduled",
    leads: [
      {
        id: "4",
        title: "Sunflower Festival (Sample Lead)",
        date: "02/23/2022",
        time: "9:00 AM - 5:00 PM",
        status: "open",
        daysOld: 0,
        daysInStep: 0,
        contacts: ["John Appleseed (Fun Adventures Ltd)"],
      },
    ],
  },
];

export default function Leads() {
  return (
    <AppLayout>
      <div className="p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <a href="/" className="hover:text-primary">Home</a>
          <span>//</span>
          <span>Leads</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-primary">Leads</h1>
          <a href="#" className="text-sm text-primary hover:underline flex items-center gap-1">
            📋 Activity Log
          </a>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-6">
          <button className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Add Lead
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
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    idx === 1
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
              {columns.map((column, idx) => (
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
