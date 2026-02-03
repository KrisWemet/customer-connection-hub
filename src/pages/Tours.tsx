import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar as CalendarIcon, CheckCircle2, ClipboardList, XCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { Calendar } from "@/components/ui/calendar";
import { ToursSkeleton } from "@/components/ToursSkeleton";
import { cn } from "@/lib/utils";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Inquiry = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
};

type Tour = {
  id: string;
  inquiry_id: string;
  tour_date: string;
  tour_time: string;
  attendees: { name: string; relationship?: string }[] | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  tour_notes?: string | null;
  follow_up_sent?: boolean | null;
  outcome?: "interested" | "not_interested" | "booked" | "thinking" | null;
  created_at?: string | null;
  updated_at?: string | null;
  inquiries?: Inquiry | null;
};

type Booking = {
  id: string;
  client_name?: string | null;
  start_date: string;
  end_date: string;
};

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

const statusOptions: Tour["status"][] = ["scheduled", "completed", "cancelled", "no_show"];
const outcomeOptions: NonNullable<Tour["outcome"]>[] = ["interested", "thinking", "booked", "not_interested"];

function formatTime(value: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes || "0"));
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function combineDateTime(date: string, time: string) {
  const normalizedTime = time ? (time.length === 5 ? `${time}:00` : time) : "00:00:00";
  return new Date(`${date}T${normalizedTime}`);
}

export default function Tours() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | Tour["status"]>("all");
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    inquiryId: "",
    tourDate: "",
    tourTime: "",
    attendeeName: "",
    attendeeRelationship: "",
    attendees: [] as { name: string; relationship?: string }[],
  });
  const [editForm, setEditForm] = useState({
    status: "scheduled" as Tour["status"],
    outcome: "" as "" | NonNullable<Tour["outcome"]>,
    notes: "",
    followUpSent: false,
  });

  const { data: inquiries = [], error: inquiriesError } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as Inquiry[];
      const { data, error } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Inquiry[];
    },
  });

  const { data: tours = [], isLoading: toursLoading, error: toursError } = useQuery({
    queryKey: ["tours"],
    queryFn: async () => {
      if (!supabaseConfigured) return [] as Tour[];
      const { data, error } = await supabase
        .from("tours")
        .select("*, inquiries(*)")
        .order("tour_date", { ascending: true })
        .order("tour_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tour[];
    },
  });

  const { data: bookings = [], error: bookingsError } = useQuery({
    queryKey: ["bookings"],
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

  // Handle query errors
  useEffect(() => {
    if (toursError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: toursError instanceof Error ? toursError.message : "Failed to load tours",
      });
    }
    if (inquiriesError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: inquiriesError instanceof Error ? inquiriesError.message : "Failed to load inquiries",
      });
    }
    if (bookingsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: bookingsError instanceof Error ? bookingsError.message : "Failed to load bookings",
      });
    }
  }, [toursError, inquiriesError, bookingsError, toast]);

  const createTourMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        inquiry_id: scheduleForm.inquiryId,
        tour_date: scheduleForm.tourDate,
        tour_time: scheduleForm.tourTime,
        attendees: scheduleForm.attendees,
      };
      const { error } = await supabase.from("tours").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setScheduleForm({
        inquiryId: "",
        tourDate: "",
        tourTime: "",
        attendeeName: "",
        attendeeRelationship: "",
        attendees: [],
      });
      queryClient.invalidateQueries({ queryKey: ["tours"] });
      toast({
        title: "Success",
        description: "Tour scheduled successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule tour",
      });
    },
  });

  const updateTourMutation = useMutation({
    mutationFn: async (payload: Partial<Tour>) => {
      if (!selectedTourId) throw new Error("Select a tour to update.");
      const { error } = await supabase.from("tours").update(payload).eq("id", selectedTourId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
      toast({
        title: "Success",
        description: "Tour updated successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update tour",
      });
    },
  });

  const selectedTour = tours.find((tour) => tour.id === selectedTourId) ?? null;

  useEffect(() => {
    if (!selectedTour) return;
    setEditForm({
      status: selectedTour.status,
      outcome: selectedTour.outcome ?? "",
      notes: selectedTour.tour_notes ?? "",
      followUpSent: Boolean(selectedTour.follow_up_sent),
    });
  }, [selectedTourId, selectedTour]);

  const tourDates = useMemo(
    () => tours.map((tour) => new Date(`${tour.tour_date}T00:00:00`)),
    [tours],
  );

  const bookingDates = useMemo(() => {
    const dates: Date[] = [];
    bookings.forEach((booking) => {
      const start = new Date(`${booking.start_date}T00:00:00`);
      const end = new Date(`${booking.end_date}T00:00:00`);
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        dates.push(new Date(date));
      }
    });
    return dates;
  }, [bookings]);

  const filteredTours = useMemo(() => {
    return tours.filter((tour) => (statusFilter === "all" ? true : tour.status === statusFilter));
  }, [tours, statusFilter]);

  const now = new Date();
  const upcomingTours = filteredTours.filter((tour) => combineDateTime(tour.tour_date, tour.tour_time) >= now);
  const pastTours = filteredTours.filter((tour) => combineDateTime(tour.tour_date, tour.tour_time) < now);

  const selectedDateTours = selectedDate
    ? tours.filter((tour) => isSameDay(new Date(`${tour.tour_date}T00:00:00`), selectedDate))
    : [];

  const selectedDateBookings = selectedDate
    ? bookings.filter((booking) => {
        const start = new Date(`${booking.start_date}T00:00:00`);
        const end = new Date(`${booking.end_date}T00:00:00`);
        return selectedDate >= start && selectedDate <= end;
      })
    : [];

  const canSchedule =
    scheduleForm.inquiryId && scheduleForm.tourDate && scheduleForm.tourTime && supabaseConfigured;

  if (toursLoading) {
    return (
      <AppLayout>
        <ToursSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Tours</span>
        </div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-4xl font-bold text-primary">Tours & Viewings</h1>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => {
              setSelectedTourId(null);
              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <CalendarIcon size={18} />
            Schedule Tour
          </button>
        </div>

        <SupabaseNotice title="Supabase not configured for tours." />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Tours Calendar</h2>
                  <p className="text-xs text-muted-foreground">See tours and bookings side by side.</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    Tours
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Bookings
                  </span>
                </div>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ tours: tourDates, bookings: bookingDates }}
                modifiersClassNames={{
                  tours: "bg-blue-100 text-blue-900",
                  bookings: "bg-emerald-100 text-emerald-900",
                }}
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tours on {selectedDate ? selectedDate.toLocaleDateString() : "Selected date"}
                  </p>
                  <div className="mt-3 space-y-3 text-sm">
                    {selectedDateTours.length === 0 ? (
                      <p className="text-muted-foreground">No tours scheduled.</p>
                    ) : (
                      selectedDateTours.map((tour) => (
                        <div
                          key={tour.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                        >
                          <div>
                            <p className="font-semibold text-foreground">
                              {tour.inquiries?.full_name ?? "Unknown inquiry"}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatTime(tour.tour_time)}</p>
                          </div>
                          <span className="text-xs font-semibold text-primary">{tour.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bookings on {selectedDate ? selectedDate.toLocaleDateString() : "Selected date"}
                  </p>
                  <div className="mt-3 space-y-3 text-sm">
                    {selectedDateBookings.length === 0 ? (
                      <p className="text-muted-foreground">No bookings on this date.</p>
                    ) : (
                      selectedDateBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                        >
                          <div>
                            <p className="font-semibold text-foreground">{booking.client_name ?? "Booking"}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                            </p>
                          </div>
                          <Link
                            to={`/bookings/${booking.id}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View
                          </Link>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Tours List</h2>
                  <p className="text-xs text-muted-foreground">Upcoming and past tours with outcomes.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["all", ...statusOptions] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                        statusFilter === status
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                      )}
                    >
                      {status === "all" ? "all" : status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Upcoming</h3>
                    <div className="space-y-3">
                      {upcomingTours.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No upcoming tours.</p>
                      ) : (
                        upcomingTours.map((tour) => (
                          <div
                            key={tour.id}
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3",
                              tour.id === selectedTourId && "border-primary/40 bg-primary/5",
                            )}
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {tour.inquiries?.full_name ?? "Unknown inquiry"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(tour.tour_date)} • {formatTime(tour.tour_time)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Status: <span className="font-semibold">{tour.status.replace("_", " ")}</span>
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <Link to={`/leads/${tour.inquiry_id}`} className="font-semibold text-primary">
                                View inquiry
                              </Link>
                              <button
                                type="button"
                                className="rounded-lg border border-border px-3 py-1 font-semibold text-muted-foreground"
                                onClick={() => setSelectedTourId(tour.id)}
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Past</h3>
                    <div className="space-y-3">
                      {pastTours.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No past tours.</p>
                      ) : (
                        pastTours.map((tour) => (
                          <div
                            key={tour.id}
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3",
                              tour.id === selectedTourId && "border-primary/40 bg-primary/5",
                            )}
                          >
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {tour.inquiries?.full_name ?? "Unknown inquiry"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(tour.tour_date)} • {formatTime(tour.tour_time)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Outcome: <span className="font-semibold">{tour.outcome ?? "-"}</span>
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <Link to={`/leads/${tour.inquiry_id}`} className="font-semibold text-primary">
                                View inquiry
                              </Link>
                              <button
                                type="button"
                                className="rounded-lg border border-border px-3 py-1 font-semibold text-muted-foreground"
                                onClick={() => setSelectedTourId(tour.id)}
                              >
                                Manage
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <div className="space-y-6">
            <div ref={formRef} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <CalendarIcon size={18} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Schedule Tour</h2>
              </div>
              <div className="space-y-4">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Inquiry
                  <select
                    className={cn(inputClassName, "mt-2")}
                    value={scheduleForm.inquiryId}
                    onChange={(event) => setScheduleForm({ ...scheduleForm, inquiryId: event.target.value })}
                  >
                    <option value="">Select inquiry</option>
                    {inquiries.map((inquiry) => (
                      <option key={inquiry.id} value={inquiry.id}>
                        {inquiry.full_name ?? "Unnamed inquiry"} {inquiry.email ? `• ${inquiry.email}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Date
                    <input
                      className={cn(inputClassName, "mt-2")}
                      type="date"
                      value={scheduleForm.tourDate}
                      onChange={(event) => setScheduleForm({ ...scheduleForm, tourDate: event.target.value })}
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Time
                    <input
                      className={cn(inputClassName, "mt-2")}
                      type="time"
                      value={scheduleForm.tourTime}
                      onChange={(event) => setScheduleForm({ ...scheduleForm, tourTime: event.target.value })}
                    />
                  </label>
                </div>
                <div className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attendees</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1.2fr_1fr_auto]">
                    <input
                      className={inputClassName}
                      placeholder="Name"
                      value={scheduleForm.attendeeName}
                      onChange={(event) => setScheduleForm({ ...scheduleForm, attendeeName: event.target.value })}
                    />
                    <input
                      className={inputClassName}
                      placeholder="Relationship"
                      value={scheduleForm.attendeeRelationship}
                      onChange={(event) =>
                        setScheduleForm({ ...scheduleForm, attendeeRelationship: event.target.value })
                      }
                    />
                    <button
                      type="button"
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
                      onClick={() => {
                        if (!scheduleForm.attendeeName.trim()) return;
                        setScheduleForm({
                          ...scheduleForm,
                          attendeeName: "",
                          attendeeRelationship: "",
                          attendees: [
                            ...scheduleForm.attendees,
                            {
                              name: scheduleForm.attendeeName.trim(),
                              relationship: scheduleForm.attendeeRelationship.trim() || undefined,
                            },
                          ],
                        });
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {scheduleForm.attendees.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {scheduleForm.attendees.map((attendee, index) => (
                        <button
                          type="button"
                          key={`${attendee.name}-${index}`}
                          className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                          onClick={() =>
                            setScheduleForm({
                              ...scheduleForm,
                              attendees: scheduleForm.attendees.filter((_, i) => i !== index),
                            })
                          }
                        >
                          {attendee.name}
                          {attendee.relationship ? ` • ${attendee.relationship}` : ""} ✕
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-lg px-4 py-2 text-sm font-semibold transition-opacity",
                    canSchedule ? "bg-foreground text-background hover:opacity-90" : "bg-muted text-muted-foreground",
                  )}
                  disabled={!canSchedule || createTourMutation.isPending}
                  onClick={() => createTourMutation.mutate()}
                >
                  {createTourMutation.isPending ? "Scheduling..." : "Schedule Tour"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList size={18} className="text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Tour Details</h2>
              </div>
              {selectedTour ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedTour.inquiries?.full_name ?? "Unknown inquiry"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(selectedTour.tour_date)} • {formatTime(selectedTour.tour_time)}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                      <select
                        className={cn(inputClassName, "mt-2")}
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm({ ...editForm, status: event.target.value as Tour["status"] })
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Outcome
                      <select
                        className={cn(inputClassName, "mt-2")}
                        value={editForm.outcome}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            outcome: event.target.value as NonNullable<Tour["outcome"]> | "",
                          })
                        }
                      >
                        <option value="">Select outcome</option>
                        {outcomeOptions.map((outcome) => (
                          <option key={outcome} value={outcome}>
                            {outcome.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                    <textarea
                      className={cn(inputClassName, "mt-2 min-h-[110px] resize-none")}
                      value={editForm.notes}
                      onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={editForm.followUpSent}
                      onChange={(event) => setEditForm({ ...editForm, followUpSent: event.target.checked })}
                    />
                    Follow-up sent
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
                      onClick={() => updateTourMutation.mutate({ status: "completed" })}
                    >
                      <CheckCircle2 size={14} />
                      Mark Complete
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
                      onClick={() => updateTourMutation.mutate({ status: "cancelled" })}
                    >
                      <XCircle size={14} />
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
                      onClick={() => updateTourMutation.mutate({ status: "no_show" })}
                    >
                      <XCircle size={14} />
                      No Show
                    </button>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background"
                    onClick={() =>
                      updateTourMutation.mutate({
                        status: editForm.status,
                        outcome: editForm.outcome || null,
                        tour_notes: editForm.notes || null,
                        follow_up_sent: editForm.followUpSent,
                      })
                    }
                    disabled={updateTourMutation.isPending}
                  >
                    {updateTourMutation.isPending ? "Saving..." : "Save Updates"}
                  </button>
                  {editForm.outcome === "interested" && (
                    <Link
                      to={`/leads/${selectedTour.inquiry_id}`}
                      className="flex w-full items-center justify-center rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary"
                    >
                      Send Contract
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a tour to update status and outcome.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
