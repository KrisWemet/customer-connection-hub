import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { format, addDays, parseISO } from "date-fns";
import { ShieldCheck, RotateCw, CheckCircle2, AlertTriangle } from "lucide-react";

type Deposit = Tables<"damage_deposits"> & {
  bookings?: Pick<Tables<"bookings">, "start_date" | "end_date"> | null;
};

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  collected: "bg-blue-100 text-blue-800",
  refunded: "bg-emerald-100 text-emerald-800",
  deducted: "bg-rose-100 text-rose-800",
  waived: "bg-gray-200 text-gray-700",
};

export default function DamageDeposits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState({
    booking_id: "",
    amount: 500,
    notes: "",
  });

  const { data: settings } = useQuery({
    queryKey: ["venue_settings"],
    queryFn: async () => {
      if (!supabaseConfigured) return null;
      const { data, error } = await supabase.from("venue_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: supabaseConfigured,
    staleTime: 5 * 60 * 1000,
  });

  const refundWindowDays = settings?.damage_deposit_refund_days ?? 7;

  const { data: deposits = [], isFetching } = useQuery({
    queryKey: ["damage_deposits"],
    queryFn: async (): Promise<Deposit[]> => {
      if (!supabaseConfigured) return [];
      const { data, error } = await supabase
        .from("damage_deposits")
        .select("*, bookings(start_date,end_date)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: supabaseConfigured,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!supabaseConfigured) throw new Error("Supabase not configured");
      const payload = {
        booking_id: form.booking_id || null,
        amount: form.amount,
        notes: form.notes || null,
      };
      const { error } = await supabase.from("damage_deposits").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Damage deposit created" });
      queryClient.invalidateQueries({ queryKey: ["damage_deposits"] });
      setForm({ booking_id: "", amount: settings?.damage_deposit_amount ?? 500, notes: "" });
    },
    onError: (error) => {
      toast({ title: "Create failed", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (args: { id: string; status: string; deductions?: number; notes?: string }) => {
      if (!supabaseConfigured) throw new Error("Supabase not configured");
      const payload: Partial<Tables<"damage_deposits">> = {
        status: args.status,
        deductions: args.deductions ?? undefined,
        notes: args.notes ?? undefined,
        collected_at: args.status === "collected" ? new Date().toISOString() : undefined,
        refunded_at: args.status === "refunded" ? new Date().toISOString() : undefined,
      };
      const { error } = await supabase.from("damage_deposits").update(payload).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["damage_deposits"] });
    },
    onError: (error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const rows = useMemo(() => deposits, [deposits]);

  return (
    <AppLayout>
      <div className="p-6 md:p-10 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Damage Deposits</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Damage Deposits</h1>
            <p className="text-sm text-muted-foreground">
              Collect at check-in and refund within {refundWindowDays} days after event end.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck size={18} />
            <span>Default amount: ${settings?.damage_deposit_amount ?? 500}</span>
          </div>
        </div>

        {!supabaseConfigured && <SupabaseNotice title="Supabase not configured. Data will not persist." />}

        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-lg font-semibold mb-3">Create / Log Deposit</h2>
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!supabaseConfigured || createMutation.isPending) return;
              createMutation.mutate();
            }}
          >
            <Input
              placeholder="Booking ID (optional for now)"
              value={form.booking_id}
              onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step={25}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.valueAsNumber })}
              placeholder="Amount"
            />
            <Input
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div className="md:col-span-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm({
                    booking_id: "",
                    amount: settings?.damage_deposit_amount ?? 500,
                    notes: "",
                  })
                }
              >
                Reset
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !supabaseConfigured}>
                {createMutation.isPending ? "Saving..." : "Save Deposit"}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">All Deposits</h2>
            {isFetching && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RotateCw size={14} className="animate-spin" /> Refreshing
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Booking</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Collected</th>
                  <th className="py-2 pr-3">Refunded</th>
                  <th className="py-2 pr-3">Refund Due</th>
                  <th className="py-2 pr-3">Notes / Deductions</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const endDate = row.bookings?.end_date;
                  const refundDue = endDate
                    ? format(addDays(parseISO(endDate), refundWindowDays), "yyyy-MM-dd")
                    : "—";
                  return (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="py-3 pr-3">
                        <div className="text-foreground font-medium text-sm">
                          {row.booking_id ?? "Unassigned"}
                        </div>
                        {row.bookings?.end_date && (
                          <div className="text-xs text-muted-foreground">
                            Event: {row.bookings?.start_date} → {row.bookings?.end_date}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-3">${row.amount.toFixed(2)}</td>
                      <td className="py-3 pr-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge[row.status] ?? "bg-gray-200 text-gray-700"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {row.collected_at ? format(new Date(row.collected_at), "yyyy-MM-dd") : "—"}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {row.refunded_at ? format(new Date(row.refunded_at), "yyyy-MM-dd") : "—"}
                      </td>
                      <td className="py-3 pr-3 text-muted-foreground">{refundDue}</td>
                      <td className="py-3 pr-3">
                        <div className="text-sm text-foreground">
                          {row.notes ?? "—"}
                        </div>
                        {row.deductions > 0 && (
                          <div className="text-xs text-rose-600">Deductions: ${row.deductions.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="py-3 pr-0">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={row.status !== "pending" || updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({ id: row.id, status: "collected" })
                            }
                          >
                            Collect
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={row.status === "refunded" || updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({ id: row.id, status: "refunded", deductions: row.deductions, notes: row.notes ?? undefined })
                            }
                          >
                            Refund
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({ id: row.id, status: "deducted", deductions: row.deductions ?? 0, notes: row.notes ?? undefined })
                            }
                          >
                            Deduct
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      No damage deposits logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>
            Tip: Refund within {refundWindowDays} days after end date to stay compliant with policy.
          </span>
          <AlertTriangle size={14} className="text-amber-600" />
          <span>Track deductions in the notes field; status “deducted” keeps audit trail.</span>
        </div>
      </div>
    </AppLayout>
  );
}
