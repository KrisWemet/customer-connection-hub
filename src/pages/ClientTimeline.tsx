import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import type { Tables } from "@/types/supabase";
import { Clock, MapPin, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const cardClass = "rounded-2xl border border-border/60 bg-card p-6 shadow-card";
const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

type TimelineEvent = Tables<"timeline_events">;

function formatTime(timeStr: string) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ClientTimeline() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    event_date: "",
    start_time: "",
    end_time: "",
    title: "",
    description: "",
    location: "",
  });

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["client_booking", user?.email],
    enabled: supabaseConfigured && Boolean(user?.email),
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("id, start_date, end_date")
        .eq("client_email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["client_timeline", booking?.id],
    enabled: supabaseConfigured && Boolean(booking?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timeline_events")
        .select("*")
        .eq("booking_id", booking?.id ?? "")
        .order("event_date", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TimelineEvent[];
    },
  });

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!booking?.id) throw new Error("No booking linked");
      const payload = {
        booking_id: booking.id,
        event_date: formState.event_date,
        start_time: formState.start_time,
        end_time: formState.end_time || null,
        title: formState.title.trim(),
        description: formState.description.trim() || null,
        location: formState.location.trim() || null,
      };
      const { error } = await supabase.from("timeline_events").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setFormState({
        event_date: "",
        start_time: "",
        end_time: "",
        title: "",
        description: "",
        location: "",
      });
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ["client_timeline", booking?.id] });
      toast.success("Event added to timeline");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add event");
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timeline_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_timeline", booking?.id] });
      toast.success("Event removed");
    },
  });

  const isLoading = bookingLoading || eventsLoading;

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = event.event_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, TimelineEvent[]>);

  const sortedDates = Object.keys(eventsByDate).sort();

  // Get wedding days (Friday-Sunday)
  const weddingDays = [];
  if (booking?.start_date && booking?.end_date) {
    const start = new Date(booking.start_date);
    const end = new Date(booking.end_date);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      weddingDays.push(d.toISOString().split("T")[0]);
    }
  }

  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Weekend Timeline
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Your wedding weekend</h1>
            <p className="text-sm text-muted-foreground">
              Build your ceremony and reception schedule, hour by hour.
            </p>
          </div>

          <SupabaseNotice title="Supabase not configured for timeline." />

          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : !booking ? (
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">No booking linked</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldn&apos;t find a booking for {user?.email ?? "your account"}.
              </p>
            </div>
          ) : (
            <>
              <div className={cardClass}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Timeline</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {showAddForm ? "Cancel" : "Add event"}
                  </button>
                </div>

                {showAddForm && (
                  <div className="mt-4 rounded-xl border border-border/60 bg-background p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        className={inputClass}
                        type="date"
                        value={formState.event_date}
                        onChange={(e) => setFormState({ ...formState, event_date: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className={inputClass}
                          type="time"
                          value={formState.start_time}
                          onChange={(e) => setFormState({ ...formState, start_time: e.target.value })}
                        />
                        <input
                          className={inputClass}
                          type="time"
                          value={formState.end_time}
                          onChange={(e) => setFormState({ ...formState, end_time: e.target.value })}
                        />
                      </div>
                      <input
                        className={inputClass}
                        placeholder="Event title *"
                        value={formState.title}
                        onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="Location"
                        value={formState.location}
                        onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                      />
                      <input
                        className={cn(inputClass, "md:col-span-2")}
                        placeholder="Description (optional)"
                        value={formState.description}
                        onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                      />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => createEvent.mutate()}
                        disabled={!formState.event_date || !formState.start_time || !formState.title.trim() || createEvent.isPending}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {createEvent.isPending ? "Adding..." : "Add event"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {weddingDays.length > 0 && (
                <div className="grid gap-4">
                  {weddingDays.map((day, idx) => {
                    const dayEvents = eventsByDate[day] || [];
                    const isExpanded = expandedDay === day;
                    const dayName = ["Friday", "Saturday", "Sunday"][idx] || `Day ${idx + 1}`;

                    return (
                      <div key={day} className={cardClass}>
                        <button
                          onClick={() => setExpandedDay(isExpanded ? null : day)}
                          className="flex w-full items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                              <Clock size={20} />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold text-foreground">{dayName}</h3>
                              <p className="text-xs text-muted-foreground">{formatDate(day)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {dayEvents.length} events
                            </span>
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t border-border/50 pt-4">
                            {dayEvents.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No events scheduled yet.
                              </p>
                            ) : (
                              dayEvents.map((event) => (
                                <div
                                  key={event.id}
                                  className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-background p-3"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {formatTime(event.start_time)}
                                      </span>
                                      {event.end_time && (
                                        <span className="text-sm text-muted-foreground">
                                          - {formatTime(event.end_time)}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="mt-1 font-medium text-foreground">{event.title}</h4>
                                    {event.description && (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {event.description}
                                      </p>
                                    )}
                                    {event.location && (
                                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                                        <MapPin size={12} />
                                        {event.location}
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => deleteEvent.mutate(event.id)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {sortedDates.length > weddingDays.length && (
                <div className={cardClass}>
                  <h3 className="font-semibold text-foreground">Additional Events</h3>
                  <div className="mt-4 space-y-3">
                    {sortedDates
                      .filter((date) => !weddingDays.includes(date))
                      .map((date) => (
                        <div key={date}>
                          <h4 className="text-sm font-medium text-muted-foreground">
                            {formatDate(date)}
                          </h4>
                          <div className="mt-2 space-y-2">
                            {eventsByDate[date].map((event) => (
                              <div
                                key={event.id}
                                className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-background p-3"
                              >
                                <div className="flex-1">
                                  <span className="font-semibold text-foreground">
                                    {formatTime(event.start_time)}
                                  </span>
                                  <h4 className="mt-1 font-medium text-foreground">{event.title}</h4>
                                </div>
                                <button
                                  onClick={() => deleteEvent.mutate(event.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
