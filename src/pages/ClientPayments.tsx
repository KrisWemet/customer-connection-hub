import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/types/supabase";

const cardClass =
  "rounded-2xl border border-border/60 bg-card p-6 shadow-card";

function formatCurrency(value?: number | null) {
  if (!value) return "$0.00";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClientPayments() {
  const { user } = useAuth();

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["client_booking", user?.email],
    enabled: supabaseConfigured && Boolean(user?.email),
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from("bookings")
        .select("id, client_name, client_email, start_date, end_date")
        .eq("client_email", user.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: schedule = [], isLoading: scheduleLoading } = useQuery({
    queryKey: ["client_payment_schedule", booking?.id],
    enabled: supabaseConfigured && Boolean(booking?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_schedule")
        .select("*")
        .eq("booking_id", booking?.id ?? "")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tables<"payment_schedule">[];
    },
  });

  const { totalDue, nextPayment } = useMemo(() => {
    const unpaid = schedule.filter((row) => row.status !== "paid");
    const total = unpaid.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const next = unpaid.sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null;
    return { totalDue: total, nextPayment: next };
  }, [schedule]);

  const isLoading = bookingLoading || scheduleLoading;

  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Payments
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Your payment schedule</h1>
            <p className="text-sm text-muted-foreground">
              Keep track of whats been paid and whats coming up next.
            </p>
          </div>

          <SupabaseNotice title="Supabase not configured for client payments." />

          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : !booking ? (
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">No booking linked</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We couldnt find a booking for {user?.email ?? "your account"}. If you think this is a mistake,
                let the venue team know.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Total outstanding</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(totalDue)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Booking for {booking.client_name ?? "your event"}
                  </p>
                </div>
                <div className={cardClass}>
                  <p className="text-sm text-muted-foreground">Next payment</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {nextPayment ? formatCurrency(nextPayment.amount) : "$0.00"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {nextPayment ? `${nextPayment.label} due ${formatDate(nextPayment.due_date)}` : "All set"}
                  </p>
                </div>
              </div>

              <div className={cardClass}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Payment timeline</h2>
                  <button className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">
                    Pay now
                  </button>
                </div>
                <div className="mt-4 divide-y divide-border/50">
                  {schedule.length === 0 ? (
                    <p className="py-6 text-sm text-muted-foreground">No payment schedule yet.</p>
                  ) : (
                    schedule.map((row) => (
                      <div key={row.id} className="flex items-center justify-between py-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{row.label}</p>
                          <p className="text-xs text-muted-foreground">Due {formatDate(row.due_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(row.amount)}</p>
                          <p className={`text-xs ${row.status === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                            {row.status === "paid" ? "Paid" : "Outstanding"}
                          </p>
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
