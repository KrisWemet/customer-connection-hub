import { useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  ShieldCheck,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { Tables } from "@/types/supabase";
import { format, addDays, isAfter } from "date-fns";

type Booking = Tables<"bookings">;
type Schedule = Tables<"payment_schedule">;
type Deposit = Tables<"damage_deposits">;
type Upsell = Tables<"upsells">;

const badge = (status: string) => {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "overdue":
      return "bg-rose-100 text-rose-800";
    case "canceled":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ["booking", id],
    enabled: supabaseConfigured && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ["payment_schedule", id],
    enabled: supabaseConfigured && !!id,
    queryFn: async (): Promise<Schedule[]> => {
      const { data, error } = await supabase
        .from("payment_schedule")
        .select("*")
        .eq("booking_id", id)
        .order("installment_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: deposit } = useQuery({
    queryKey: ["damage_deposit", id],
    enabled: supabaseConfigured && !!id,
    queryFn: async (): Promise<Deposit | null> => {
      const { data, error } = await supabase
        .from("damage_deposits")
        .select("*")
        .eq("booking_id", id)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const { data: upsells = [] } = useQuery({
    queryKey: ["upsells", id],
    enabled: supabaseConfigured && !!id,
    queryFn: async (): Promise<Upsell[]> => {
      const { data, error } = await supabase.from("upsells").select("*").eq("booking_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: contract } = useQuery({
    queryKey: ["contract_by_booking", id],
    enabled: supabaseConfigured && !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("*").eq("booking_id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paymentStats = useMemo(() => {
    const total = schedule.reduce((sum, r) => sum + r.amount, 0);
    const paid = schedule.reduce((sum, r) => (r.status === "paid" ? sum + r.amount : sum), 0);
    const outstanding = total - paid;
    return { total, paid, outstanding };
  }, [schedule]);

  const markPaid = useMutation({
    mutationFn: async (row: Schedule) => {
      const { error } = await supabase
        .from("payment_schedule")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment_schedule", id] });
    },
    onError: (error) => {
      toast({ title: "Failed to update payment", description: error.message, variant: "destructive" });
    },
  });

  const updateDepositStatus = useMutation({
    mutationFn: async (args: { status: Deposit["status"]; deductions?: number; notes?: string }) => {
      if (!deposit) throw new Error("No deposit found");
      const payload: Partial<Deposit> = {
        status: args.status,
        deductions: args.deductions ?? deposit.deductions ?? 0,
        notes: args.notes ?? deposit.notes ?? null,
      };
      if (args.status === "collected") payload.collected_at = new Date().toISOString();
      if (args.status === "refunded") payload.refunded_at = new Date().toISOString();
      const { error } = await supabase.from("damage_deposits").update(payload).eq("id", deposit.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["damage_deposit", id] }),
    onError: (error) =>
      toast({ title: "Deposit update failed", description: error.message, variant: "destructive" }),
  });

  const cancelBooking = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      toast({ title: "Booking cancelled" });
    },
    onError: (error) =>
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" }),
  });

  if (bookingLoading) {
    return (
      <AppLayout>
        <div className="p-8 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="animate-spin" size={16} /> Loading booking…
        </div>
      </AppLayout>
    );
  }

  if (!booking) {
    return (
      <AppLayout>
        <div className="p-8">
          <h1 className="text-2xl font-semibold text-foreground">Booking not found</h1>
          <p className="text-muted-foreground">No booking exists for ID {id}.</p>
        </div>
      </AppLayout>
    );
  }

  const statusClass = badge(booking.status);
  const refundDue =
    booking.end_date && deposit
      ? format(addDays(new Date(booking.end_date), 7), "yyyy-MM-dd")
      : "—";

  return (
    <AppLayout>
      <div className="p-8 space-y-6">
        {!supabaseConfigured && <SupabaseNotice title="Supabase not configured. Data may not load." />}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <span>//</span>
          <Link to="/events" className="hover:text-primary">
            Bookings
          </Link>
          <span>//</span>
          <span>{booking.id}</span>
        </div>

        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-primary">Booking {booking.id}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {booking.start_date} → {booking.end_date}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                  {booking.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">Edit Booking</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm("Cancel this booking?")) cancelBooking.mutate();
                }}
              >
                Cancel Booking
              </Button>
              {contract ? (
                <Button variant="secondary" asChild>
                  <Link to={`/contract/sign/${contract.id}`}>
                    View Contract <ExternalLink size={14} />
                  </Link>
                </Button>
              ) : (
                <Button variant="secondary" disabled>
                  View Contract
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold">Client:</span>
            <span>{booking.client_name ?? "N/A"}</span>
            <a className="inline-flex items-center gap-1 text-primary" href={`mailto:${booking.client_email ?? ""}`}>
              <Mail size={14} /> {booking.client_email ?? "email"}
            </a>
            <span className="font-semibold">Package:</span>
            <span>{booking.package_type}</span>
            <span className="font-semibold">Total Base:</span>
            <span>${booking.base_price.toFixed(2)}</span>
          </div>
        </div>

        {/* Guest & Capacity */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold mb-3">Guests & Capacity</h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <CapacityRow
              label="Reception guests"
              value={booking.estimated_day_guests ?? 0}
              cap={150}
            />
            <CapacityRow
              label="Camping guests"
              value={booking.estimated_overnight_guests ?? 0}
              cap={60}
            />
            <CapacityRow label="RV sites" value={booking.rv_sites ?? 0} cap={15} />
          </div>
        </div>

        {/* Payment schedule */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Payment Schedule</h2>
            <div className="text-sm text-muted-foreground">
              Total: ${paymentStats.total.toFixed(2)} • Paid: ${paymentStats.paid.toFixed(2)} • Outstanding: $
              {paymentStats.outstanding.toFixed(2)}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Label</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Paid At</th>
                  <th className="py-2 pr-3">Stripe Intent</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => {
                  const overdue =
                    row.status === "pending" && isAfter(new Date(), new Date(row.due_date));
                  const statusClass = badge(overdue ? "overdue" : row.status);
                  return (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="py-2 pr-3">{row.installment_order}</td>
                      <td className="py-2 pr-3">{row.label}</td>
                      <td className="py-2 pr-3">${row.amount.toFixed(2)}</td>
                      <td className="py-2 pr-3">{row.due_date}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                          {overdue ? "overdue" : row.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {row.paid_at ? format(new Date(row.paid_at), "yyyy-MM-dd") : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {row.stripe_payment_intent_id ? (
                          <a
                            className="text-primary inline-flex items-center gap-1"
                            href={`https://dashboard.stripe.com/test/payments/${row.stripe_payment_intent_id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {row.stripe_payment_intent_id}
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-0 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={row.status === "paid" || markPaid.isPending}
                          onClick={() => markPaid.mutate(row)}
                        >
                          Mark as Paid
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {schedule.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-center text-muted-foreground">
                      No payment schedule found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Damage deposit */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Damage Deposit</h2>
            <div className="text-sm text-muted-foreground">Refund due: {refundDue}</div>
          </div>
          {deposit ? (
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Amount</div>
                <div className="font-semibold">${deposit.amount.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge(deposit.status)}`}>
                  {deposit.status}
                </span>
              </div>
              <div>
                <div className="text-muted-foreground">Collected</div>
                <div>{deposit.collected_at ? format(new Date(deposit.collected_at), "yyyy-MM-dd") : "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Refunded</div>
                <div>{deposit.refunded_at ? format(new Date(deposit.refunded_at), "yyyy-MM-dd") : "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Deductions</div>
                <div>${(deposit.deductions ?? 0).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Notes</div>
                <div>{deposit.notes ?? "—"}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No damage deposit record.</div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={!deposit || updateDepositStatus.isPending}
              onClick={() => updateDepositStatus.mutate({ status: "collected" })}
            >
              Collect Deposit
            </Button>
            <Button
              variant="outline"
              disabled={!deposit || updateDepositStatus.isPending}
              onClick={() => updateDepositStatus.mutate({ status: "refunded" })}
            >
              Refund Deposit
            </Button>
            <Button
              variant="destructive"
              disabled={!deposit || updateDepositStatus.isPending}
              onClick={() =>
                updateDepositStatus.mutate({ status: "deducted", deductions: deposit?.deductions ?? 0 })
              }
            >
              Record Deduction
            </Button>
          </div>
        </div>

        {/* Upsells */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-2">
          <h2 className="text-lg font-semibold">Upsells / Add-ons</h2>
          {upsells.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upsells recorded.</div>
          ) : (
            <div className="space-y-2 text-sm">
              {upsells.map((u) => (
                <div key={u.id} className="flex justify-between border-b border-border/60 pb-1">
                  <span>{u.type}</span>
                  <span>
                    {u.quantity} @ ${u.unit_price.toFixed(2)} = ${u.total_amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notes</h2>
            <Button variant="outline" size="sm">
              Edit notes
            </Button>
          </div>
          <div className="text-sm text-foreground whitespace-pre-wrap">{booking.special_requests ?? "—"}</div>
        </div>

        {/* Activity */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card space-y-2">
          <h2 className="text-lg font-semibold">Activity</h2>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>Created: {booking.created_at ?? "—"}</li>
            <li>Updated: {booking.updated_at ?? "—"}</li>
            <li>Contract sent: {booking.contract_sent_date ?? "—"}</li>
            <li>Contract signed: {booking.contract_signed_date ?? "—"}</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}

function CapacityRow({ label, value, cap }: { label: string; value: number; cap: number }) {
  const over = value > cap;
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold">{value}</span>
        <span className="text-sm text-muted-foreground">/ {cap}</span>
        {over && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            <AlertTriangle size={12} /> Over limit
          </span>
        )}
      </div>
    </div>
  );
}
