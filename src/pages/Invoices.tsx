import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EntityTable } from "@/components/EntityTable";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function Invoices() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    status: "draft",
    amount: "",
    due_date: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      if (!supabaseConfigured) {
        return [] as Tables<"invoices">[];
      }
      const { data: rows, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return rows ?? [];
    },
  });

  const createInvoice = useMutation({
    mutationFn: async () => {
      const payload = {
        status: formState.status,
        amount: Number(formState.amount || 0),
        due_date: formState.due_date || null,
      };
      const { error } = await supabase.from("invoices").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setFormState({ status: "draft", amount: "", due_date: "" });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Payments</span>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Payments & Invoices</h1>
        </div>

        <SupabaseNotice title="Supabase not configured for invoices." />

        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Add Invoice</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!supabaseConfigured) {
                return;
              }
              createInvoice.mutate();
            }}
          >
            <input
              className={inputClassName}
              placeholder="Status (draft/sent/paid/overdue)"
              value={formState.status}
              onChange={(event) => setFormState({ ...formState, status: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Amount"
              type="number"
              value={formState.amount}
              onChange={(event) => setFormState({ ...formState, amount: event.target.value })}
            />
            <input
              className={inputClassName}
              type="date"
              value={formState.due_date}
              onChange={(event) => setFormState({ ...formState, due_date: event.target.value })}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                disabled={createInvoice.isPending || !supabaseConfigured}
              >
                {createInvoice.isPending ? "Saving..." : "Save Invoice"}
              </button>
            </div>
          </form>
        </div>

        <EntityTable
          columns={[
            { header: "Status", cell: (row) => row.status },
            { header: "Amount", cell: (row) => `$${row.amount.toFixed(2)}` },
            { header: "Due", cell: (row) => row.due_date ?? "-" },
            { header: "Paid", cell: (row) => row.paid_at ?? "-" },
          ]}
          data={data}
          emptyMessage="No invoices yet. Add your first invoice above."
        />
      </div>
    </AppLayout>
  );
}
