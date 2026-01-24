import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
type Tour = {
  id: string;
  inquiry_id: string;
  tour_date: string;
  tour_time: string;
  status: string;
  inquiries?: { full_name?: string | null } | null;
};

type CalendarBlock = {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  label?: string | null;
  notes?: string | null;
};

type Booking = {
  id: string;
  client_name?: string | null;
  start_date: string;
  end_date: string;
};

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

const eventColors = {
  tour: { bg: "#3B82F6", text: "#FFFFFF" },
  booking: { bg: "#10B981", text: "#FFFFFF" },
  block: { bg: "#F59E0B", text: "#111827" },
};

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMinutes(dateTime: string, minutes: number) {
  const d = new Date(dateTime);
  d.setMinutes(d.getMinutes() + minutes);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:00`;
}

export default function Calendars() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTours, setShowTours] = useState(true);
  const [showBookings, setShowBookings] = useState(true);
  const [showBlocks, setShowBlocks] = useState(true);
  const [formState, setFormState] = useState({
    type: "hold",
    start_date: "",
    end_date: "",
    label: "",
    notes: "",
  });

  const { data: tours = [] } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as Tour[];
      const { data, error } = await supabase
        .from("tours")
        .select("*, inquiries(full_name)")
        .order("tour_date", { ascending: true })
        .order("tour_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tour[];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings_calendar"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as Booking[];
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_name, start_date, end_date")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Booking[];
    },
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ["calendar_blocks"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as CalendarBlock[];
      const { data, error } = await supabase
        .from("calendar_blocks")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarBlock[];
    },
  });

  const createBlock = useMutation({
    mutationFn: async () => {
      const payload = {
        type: formState.type,
        start_date: formState.start_date,
        end_date: formState.end_date,
        label: formState.label || null,
        notes: formState.notes || null,
      };
      const { error } = await supabase.from("calendar_blocks").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setFormState({ type: "hold", start_date: "", end_date: "", label: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["calendar_blocks"] });
    },
  });

  const events = useMemo(() => {
    const items: any[] = [];
    if (showTours) {
      tours.forEach((tour) => {
        const start = `${tour.tour_date}T${tour.tour_time ?? "09:00"}`;
        items.push({
          id: `tour-${tour.id}`,
          title: `Tour: ${tour.inquiries?.full_name ?? "Inquiry"}`,
          start,
          end: addMinutes(start, 60),
          allDay: false,
          backgroundColor: eventColors.tour.bg,
          borderColor: eventColors.tour.bg,
          textColor: eventColors.tour.text,
          extendedProps: { type: "tour", record: tour },
        });
      });
    }
    if (showBookings) {
      bookings.forEach((booking) => {
        items.push({
          id: `booking-${booking.id}`,
          title: booking.client_name ?? "Booking",
          start: booking.start_date,
          end: addDays(booking.end_date, 1),
          allDay: true,
          backgroundColor: eventColors.booking.bg,
          borderColor: eventColors.booking.bg,
          textColor: eventColors.booking.text,
          extendedProps: { type: "booking", record: booking },
        });
      });
    }
    if (showBlocks) {
      blocks.forEach((block) => {
        items.push({
          id: `block-${block.id}`,
          title: block.label ?? block.type,
          start: block.start_date,
          end: addDays(block.end_date, 1),
          allDay: true,
          backgroundColor: eventColors.block.bg,
          borderColor: eventColors.block.bg,
          textColor: eventColors.block.text,
          extendedProps: { type: "block", record: block },
        });
      });
    }
    return items;
  }, [tours, bookings, blocks, showTours, showBookings, showBlocks]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter((event) => {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : start;
      const date = new Date(`${selectedDate}T00:00:00`);
      return date >= new Date(start.toDateString()) && date <= new Date(end.toDateString());
    });
  }, [events, selectedDate]);

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Calendar</span>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-primary">Master Calendar</h1>
            <p className="text-sm text-muted-foreground">Tours, bookings, and availability at a glance.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/tours"
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground"
            >
              Schedule Tour
            </Link>
            <Link
              to="/events"
              className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-muted-foreground"
            >
              Add Booking
            </Link>
          </div>
        </div>

        <SupabaseNotice title="Supabase not configured for calendar data." />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,3fr)]">
          <aside className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-card">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CalendarDays size={16} className="text-primary" />
                My Calendars
              </div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" checked={showTours} onChange={() => setShowTours(!showTours)} />
                  Tours
                </label>
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" checked={showBookings} onChange={() => setShowBookings(!showBookings)} />
                  Bookings
                </label>
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" checked={showBlocks} onChange={() => setShowBlocks(!showBlocks)} />
                  Availability / Holds
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Add Availability Block</h2>
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!supabaseConfigured || !formState.start_date || !formState.end_date) return;
                  createBlock.mutate();
                }}
              >
                <select
                  className={inputClassName}
                  value={formState.type}
                  onChange={(event) => setFormState({ ...formState, type: event.target.value })}
                >
                  <option value="hold">Hold</option>
                  <option value="blackout">Blackout</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="tour">Tour</option>
                  <option value="booking">Booking</option>
                </select>
                <input
                  className={inputClassName}
                  type="date"
                  value={formState.start_date}
                  onChange={(event) => setFormState({ ...formState, start_date: event.target.value })}
                />
                <input
                  className={inputClassName}
                  type="date"
                  value={formState.end_date}
                  onChange={(event) => setFormState({ ...formState, end_date: event.target.value })}
                />
                <input
                  className={inputClassName}
                  placeholder="Label"
                  value={formState.label}
                  onChange={(event) => setFormState({ ...formState, label: event.target.value })}
                />
                <input
                  className={inputClassName}
                  placeholder="Notes"
                  value={formState.notes}
                  onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
                />
                <button
                  type="submit"
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-semibold",
                    supabaseConfigured ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
                  )}
                  disabled={!supabaseConfigured || createBlock.isPending}
                >
                  {createBlock.isPending ? "Saving..." : "Add Block"}
                </button>
              </form>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Selected Day
              </div>
              {selectedDate ? (
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{selectedDate}</p>
                  {selectedDateEvents.length === 0 ? (
                    <p className="text-muted-foreground">No events scheduled.</p>
                  ) : (
                    selectedDateEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-border p-2 text-xs">
                        <p className="font-semibold text-foreground">{event.title}</p>
                        <p className="text-muted-foreground">{event.extendedProps?.type}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click a date on the calendar.</p>
              )}
            </div>
          </aside>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,listWeek",
              }}
              events={events}
              height="auto"
              dayMaxEvents={3}
              dateClick={(info) => setSelectedDate(info.dateStr)}
              eventClick={(info) => {
                const type = info.event.extendedProps?.type;
                const record = info.event.extendedProps?.record;
                if (type === "booking" && record?.id) {
                  navigate(`/bookings/${record.id}`);
                }
                if (type === "tour" && record?.inquiry_id) {
                  navigate(`/leads/${record.inquiry_id}`);
                }
              }}
            />
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
