import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { KanbanColumn } from "@/components/KanbanColumn";
import { LeadCardData } from "@/components/LeadCard";
import { LeadDetailModal } from "@/components/LeadDetailModal";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { useToast } from "@/components/ui/use-toast";
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
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

const emptyStatusCards = [
  { title: "New Inquiries", count: 0, icon: UserPlus, color: "bg-module-calendar", subtitle: "last 30 days ▾" },
  { title: "Declined", count: 0, icon: X, color: "bg-status-warning", subtitle: "last 90 days ▾", subtitleText: "Closed" },
  { title: "Booked", count: 0, icon: Trophy, color: "bg-status-warning", subtitle: "last 180 days ▾", subtitleText: "Confirmed" },
  { title: "Open", count: 0, icon: FolderOpen, color: "bg-primary", subtitle: "View" },
  { title: "Holds", count: 0, icon: Clock, color: "bg-status-warning", subtitle: "View" },
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

type Inquiry = Tables<"inquiries">;

const baseColumns: { title: string; statuses: Inquiry["status"][] }[] = [
  { title: "Inquiry", statuses: ["inquiry"] },
  { title: "Tour/Call Scheduled", statuses: ["tour_scheduled"] },
  { title: "Approved", statuses: ["contacted"] },
  { title: "Contract Sent", statuses: ["proposal_sent"] },
  { title: "Contract Signed", statuses: ["booked"] },
  { title: "Booking Confirmed", statuses: ["completed"] },
  { title: "Pre-Event Checklist", statuses: [] },
  { title: "Event Week", statuses: [] },
  { title: "Post-Event Inspection", statuses: [] },
];

export default function Leads() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeQuickView, setActiveQuickView] = useState<string>("Open + Holds");
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    phone: "",
    source: "website",
    status: "inquiry" as Inquiry["status"],
    event_start_date: "",
    estimated_guest_count: "",
    notes: "",
  });

  const { data: inquiries = [] } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as Inquiry[];
      const { data, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Inquiry[];
    },
    enabled: supabaseConfigured,
  });

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const now = new Date();

  const columns = useMemo(() => {
    return baseColumns.map((column) => {
      if (column.statuses.length === 0) {
        return { title: column.title, leads: [] as LeadCardData[] };
      }

      const leads = inquiries
        .filter((inquiry) => column.statuses.includes(inquiry.status))
        .map((inquiry) => {
          const eventDate = inquiry.event_start_date || inquiry.created_at || "";
          const date = eventDate ? new Date(eventDate) : null;
          const formattedDate = date && !Number.isNaN(date.getTime())
            ? date.toLocaleDateString("en-US")
            : "";
          const createdAt = inquiry.created_at ? new Date(inquiry.created_at) : null;
          const daysOld = createdAt && !Number.isNaN(createdAt.getTime())
            ? Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;

          return {
            id: inquiry.id,
            title: inquiry.full_name,
            date: formattedDate || "TBD",
            time: inquiry.source ? `Source: ${inquiry.source}` : "Inquiry",
            status: inquiry.status === "hold" ? "hold" : "open",
            daysOld,
            daysInStep: 0,
            contacts: [inquiry.full_name],
            tags: inquiry.estimated_guest_count
              ? [{ label: `${inquiry.estimated_guest_count} Guests`, color: "#22C55E" }]
              : undefined,
          } as LeadCardData;
        });

      return { title: column.title, leads };
    });
  }, [inquiries, now]);

  const statusCards = useMemo(() => {
    if (!supabaseConfigured) return emptyStatusCards;
    const counts = inquiries.reduce(
      (acc, inquiry) => {
        acc.total += 1;
        if (inquiry.status === "declined") acc.declined += 1;
        if (inquiry.status === "booked") acc.booked += 1;
        if (inquiry.status === "hold") acc.holds += 1;
        if (inquiry.status === "inquiry") acc.new += 1;
        return acc;
      },
      { total: 0, declined: 0, booked: 0, holds: 0, new: 0 }
    );
    return [
      { title: "New Inquiries", count: counts.new, icon: UserPlus, color: "bg-module-calendar", subtitle: "last 30 days ▾" },
      { title: "Declined", count: counts.declined, icon: X, color: "bg-status-warning", subtitle: "last 90 days ▾", subtitleText: "Closed" },
      { title: "Booked", count: counts.booked, icon: Trophy, color: "bg-status-warning", subtitle: "last 180 days ▾", subtitleText: "Confirmed" },
      { title: "Open", count: counts.total, icon: FolderOpen, color: "bg-primary", subtitle: "View" },
      { title: "Holds", count: counts.holds, icon: Clock, color: "bg-status-warning", subtitle: "View" },
    ];
  }, [inquiries]);

  const createInquiry = useMutation({
    mutationFn: async () => {
      if (!supabaseConfigured) return null;
      const payload = {
        full_name: formState.full_name.trim(),
        email: formState.email.trim() || null,
        phone: formState.phone.trim() || null,
        source: formState.source.trim() || null,
        status: formState.status,
        event_start_date: formState.event_start_date || null,
        estimated_guest_count: formState.estimated_guest_count
          ? Number(formState.estimated_guest_count)
          : null,
        notes: formState.notes.trim() || null,
      };
      const { data, error } = await supabase.from("inquiries").insert(payload).select("*").maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    onSuccess: (data) => {
      setFormState({
        full_name: "",
        email: "",
        phone: "",
        source: "website",
        status: "inquiry",
        event_start_date: "",
        estimated_guest_count: "",
        notes: "",
      });
      setShowForm(false);
      if (data) {
        queryClient.setQueryData(["inquiries"], (prev: Inquiry[] | undefined) => {
          return [data, ...(prev ?? [])];
        });
      }
      queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      toast({ title: "Inquiry saved", description: "New inquiry added to the board." });
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error?.message ?? "Could not save inquiry.",
        variant: "destructive",
      });
    },
  });

  const selectedInquiry = useMemo(() => {
    return inquiries.find((i) => i.id === selectedLeadId) || null;
  }, [inquiries, selectedLeadId]);

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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">Home</a>
          <span>//</span>
          <span>Inquiries</span>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary">Inquiries</h1>
          <a href="#" className="text-sm text-primary hover:underline flex items-center gap-1">
            📋 Inquiry Timeline
          </a>
        </div>

        <SupabaseNotice title="Supabase not configured for inquiries." />

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            onClick={() => {
              setShowForm((prev) => !prev);
              setTimeout(() => {
                const form = document.getElementById("inquiry-form");
                form?.scrollIntoView({ behavior: "smooth" });
              }, 50);
            }}
          >
            {showForm ? "Hide Form" : "Add Inquiry"}
          </button>
          <button className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
            Setup ▾
          </button>
          <div className="flex-1" />
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Begin typing to filter current view..."
              className="w-full px-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors">
            Advanced Search ▾
          </button>
        </div>

        {showForm && (
          <div id="inquiry-form" className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Add Inquiry</h2>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!supabaseConfigured || !formState.full_name.trim()) {
                  return;
                }
                createInquiry.mutate();
              }}
            >
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Full name"
                  value={formState.full_name}
                  onChange={(event) => setFormState({ ...formState, full_name: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Couple name(s) as you want it saved.</p>
              </div>
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Email"
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState({ ...formState, email: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Primary contact email.</p>
              </div>
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Phone"
                  value={formState.phone}
                  onChange={(event) => setFormState({ ...formState, phone: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Best number for texts/calls.</p>
              </div>
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Source (website, Instagram, referral)"
                  value={formState.source}
                  onChange={(event) => setFormState({ ...formState, source: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Where they heard about Rustic Retreat.</p>
              </div>
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Event start date"
                  type="date"
                  value={formState.event_start_date}
                  onChange={(event) => setFormState({ ...formState, event_start_date: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Date the event begins (estimate ok).</p>
              </div>
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Estimated guest count"
                  type="number"
                  min={0}
                  value={formState.estimated_guest_count}
                  onChange={(event) => setFormState({ ...formState, estimated_guest_count: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Rough headcount estimate.</p>
              </div>
              <div className="space-y-1">
                <select
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={formState.status}
                  onChange={(event) => setFormState({ ...formState, status: event.target.value as Inquiry["status"] })}
                >
                  <option value="inquiry">New inquiry</option>
                  <option value="contacted">Contacted</option>
                  <option value="tour_scheduled">Tour scheduled</option>
                  <option value="proposal_sent">Proposal sent</option>
                  <option value="booked">Booked</option>
                  <option value="declined">Declined</option>
                  <option value="hold">Hold</option>
                </select>
                <p className="text-xs text-muted-foreground">Current stage in the pipeline.</p>
              </div>
              <div className="space-y-1">
                <input
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Notes"
                  value={formState.notes}
                  onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Important details or special requests.</p>
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  disabled={!supabaseConfigured || createInquiry.isPending}
                >
                  {createInquiry.isPending ? "Saving..." : "Save inquiry"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statusCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-card rounded-xl p-4 border border-border/50 shadow-card flex items-center gap-4 animate-fade-in"
            >
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center shrink-0", card.color)}>
                <card.icon size={24} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-foreground whitespace-normal">{card.title}</span>
                  {card.subtitleText && (
                    <span className="text-xs text-muted-foreground">({card.subtitleText})</span>
                  )}
                  <span className="text-lg font-bold text-foreground">{card.count}</span>
                </div>
                <p className="text-xs text-primary whitespace-normal">{card.subtitle}</p>
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
                  onLeadClick={(id) => setSelectedLeadId(id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Lead Detail Modal */}
        <LeadDetailModal
          inquiry={selectedInquiry}
          isOpen={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      </div>
    </AppLayout>
  );
}
