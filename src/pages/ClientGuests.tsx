import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import type { Tables } from "@/types/supabase";
import { Users, Check, X, HelpCircle } from "lucide-react";

const cardClass = "rounded-2xl border border-border/60 bg-card p-6 shadow-card";
const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

type Guest = Tables<"guests">;

function getRsvpIcon(status: string) {
  switch (status) {
    case "yes":
      return <Check size={16} className="text-emerald-600" />;
    case "no":
      return <X size={16} className="text-red-500" />;
    default:
      return <HelpCircle size={16} className="text-amber-500" />;
  }
}

function getRsvpLabel(status: string) {
  switch (status) {
    case "yes":
      return "Attending";
    case "no":
      return "Declined";
    default:
      return "Pending";
  }
}

export default function ClientGuests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formState, setFormState] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    rsvp_status: "pending",
    meal_preference: "",
    dietary_restrictions: "",
    plus_one: false,
    plus_one_name: "",
    notes: "",
  });

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["client_booking", user?.email],
    enabled: supabaseConfigured && Boolean(user?.email),
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_name, max_reception_guests")
        .eq("client_email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: guests = [], isLoading: guestsLoading } = useQuery({
    queryKey: ["client_guests", booking?.id],
    enabled: supabaseConfigured && Boolean(booking?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .eq("booking_id", booking?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Guest[];
    },
  });

  const createGuest = useMutation({
    mutationFn: async () => {
      if (!booking?.id) throw new Error("No booking linked");
      const payload = {
        booking_id: booking.id,
        first_name: formState.first_name.trim(),
        last_name: formState.last_name.trim() || null,
        email: formState.email.trim() || null,
        phone: formState.phone.trim() || null,
        rsvp_status: formState.rsvp_status,
        meal_preference: formState.meal_preference.trim() || null,
        dietary_restrictions: formState.dietary_restrictions.trim() || null,
        plus_one: formState.plus_one,
        plus_one_name: formState.plus_one_name.trim() || null,
        notes: formState.notes.trim() || null,
      };
      const { error } = await supabase.from("guests").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setFormState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        rsvp_status: "pending",
        meal_preference: "",
        dietary_restrictions: "",
        plus_one: false,
        plus_one_name: "",
        notes: "",
      });
      setShowAddForm(false);
      queryClient.invalidateQueries({ queryKey: ["client_guests", booking?.id] });
      toast.success("Guest added");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add guest");
    },
  });

  const updateRsvp = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("guests").update({ rsvp_status: status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_guests", booking?.id] });
      toast.success("RSVP updated");
    },
  });

  const deleteGuest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("guests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_guests", booking?.id] });
      toast.success("Guest removed");
    },
  });

  const isLoading = bookingLoading || guestsLoading;

  const rsvpCounts = {
    total: guests.length,
    yes: guests.filter((g) => g.rsvp_status === "yes").length,
    no: guests.filter((g) => g.rsvp_status === "no").length,
    pending: guests.filter((g) => g.rsvp_status === "pending").length,
  };

  const maxGuests = booking?.max_reception_guests ?? 150;

  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Guest List
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Manage your guests</h1>
            <p className="text-sm text-muted-foreground">
              Track RSVPs, meal preferences, and keep your guest count organized.
            </p>
          </div>

          <SupabaseNotice title="Supabase not configured for guest list." />

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
              <div className="grid gap-4 md:grid-cols-4">
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Total guests</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{rsvpCounts.total}</p>
                  <p className="text-xs text-muted-foreground">of {maxGuests} max</p>
                </div>
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Attending</p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-600">{rsvpCounts.yes}</p>
                  <p className="text-xs text-muted-foreground">Confirmed</p>
                </div>
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Declined</p>
                  <p className="mt-2 text-3xl font-semibold text-red-500">{rsvpCounts.no}</p>
                  <p className="text-xs text-muted-foreground">Can&apos;t make it</p>
                </div>
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="mt-2 text-3xl font-semibold text-amber-500">{rsvpCounts.pending}</p>
                  <p className="text-xs text-muted-foreground">Awaiting RSVP</p>
                </div>
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Guest list</h2>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    {showAddForm ? "Cancel" : "Add guest"}
                  </button>
                </div>

                {showAddForm && (
                  <div className="mt-4 rounded-xl border border-border/60 bg-background p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        className={inputClass}
                        placeholder="First name *"
                        value={formState.first_name}
                        onChange={(e) => setFormState({ ...formState, first_name: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="Last name"
                        value={formState.last_name}
                        onChange={(e) => setFormState({ ...formState, last_name: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="Email"
                        type="email"
                        value={formState.email}
                        onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="Phone"
                        value={formState.phone}
                        onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      />
                      <select
                        className={inputClass}
                        value={formState.rsvp_status}
                        onChange={(e) => setFormState({ ...formState, rsvp_status: e.target.value })}
                      >
                        <option value="pending">RSVP: Pending</option>
                        <option value="yes">RSVP: Attending</option>
                        <option value="no">RSVP: Declined</option>
                      </select>
                      <input
                        className={inputClass}
                        placeholder="Meal preference"
                        value={formState.meal_preference}
                        onChange={(e) => setFormState({ ...formState, meal_preference: e.target.value })}
                      />
                      <input
                        className={inputClass}
                        placeholder="Dietary restrictions"
                        value={formState.dietary_restrictions}
                        onChange={(e) => setFormState({ ...formState, dietary_restrictions: e.target.value })}
                      />
                      <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={formState.plus_one}
                          onChange={(e) => setFormState({ ...formState, plus_one: e.target.checked })}
                        />
                        Bringing a plus one
                      </label>
                      {formState.plus_one && (
                        <input
                          className={inputClass}
                          placeholder="Plus one name"
                          value={formState.plus_one_name}
                          onChange={(e) => setFormState({ ...formState, plus_one_name: e.target.value })}
                        />
                      )}
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => createGuest.mutate()}
                        disabled={!formState.first_name.trim() || createGuest.isPending}
                        className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {createGuest.isPending ? "Adding..." : "Add guest"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-4 divide-y divide-border/50">
                  {guests.length === 0 ? (
                    <p className="py-6 text-sm text-muted-foreground">
                      No guests yet. Add your first guest above.
                    </p>
                  ) : (
                    guests.map((guest) => (
                      <div key={guest.id} className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-foreground">
                                {guest.first_name} {guest.last_name}
                              </p>
                              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                                {getRsvpIcon(guest.rsvp_status)}
                                {getRsvpLabel(guest.rsvp_status)}
                              </span>
                              {guest.plus_one && (
                                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                                  +1
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {guest.email && <span className="mr-3">{guest.email}</span>}
                              {guest.phone && <span>{guest.phone}</span>}
                            </div>
                            {(guest.meal_preference || guest.dietary_restrictions) && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {guest.meal_preference && (
                                  <span className="mr-3">Meal: {guest.meal_preference}</span>
                                )}
                                {guest.dietary_restrictions && (
                                  <span>Dietary: {guest.dietary_restrictions}</span>
                                )}
                              </div>
                            )}
                            {guest.plus_one && guest.plus_one_name && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Plus one: {guest.plus_one_name}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <select
                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                              value={guest.rsvp_status}
                              onChange={(e) => updateRsvp.mutate({ id: guest.id, status: e.target.value })}
                            >
                              <option value="pending">Pending</option>
                              <option value="yes">Attending</option>
                              <option value="no">Declined</option>
                            </select>
                            <button
                              onClick={() => deleteGuest.mutate(guest.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
