import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EntityTable } from "@/components/EntityTable";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { showError, showSuccess } from "@/lib/error-handler";

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function Proposals() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    title: "",
    status: "draft",
    total_amount: "",
  });

  const { data = [], error: proposalsError, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      if (!supabaseConfigured) {
        return [] as Tables<"proposals">[];
      }
      const { data: rows, error } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return rows ?? [];
    },
  });

  // Handle query errors
  useEffect(() => {
    if (proposalsError) {
      showError(proposalsError, "Failed to load proposals");
    }
  }, [proposalsError]);

  const createProposal = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formState.title || null,
        status: formState.status,
        total_amount: formState.total_amount ? Number(formState.total_amount) : null,
      };
      const { error } = await supabase.from("proposals").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setFormState({ title: "", status: "draft", total_amount: "" });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      showSuccess("Proposal created successfully");
    },
    onError: (error: unknown) => {
      showError(error, "Failed to create proposal");
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
          <span>Packages</span>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Packages & Proposals</h1>
        </div>

        <SupabaseNotice title="Supabase not configured for proposals." />

        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Create Package Proposal</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!supabaseConfigured) {
                return;
              }
              createProposal.mutate();
            }}
          >
            <input
              className={inputClassName}
              placeholder="Package title"
              value={formState.title}
              onChange={(event) => setFormState({ ...formState, title: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Status (draft/sent/signed/declined)"
              value={formState.status}
              onChange={(event) => setFormState({ ...formState, status: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Total amount"
              type="number"
              value={formState.total_amount}
              onChange={(event) => setFormState({ ...formState, total_amount: event.target.value })}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                disabled={createProposal.isPending || !supabaseConfigured}
              >
                {createProposal.isPending ? "Saving..." : "Save Proposal"}
              </button>
            </div>
          </form>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : (
          <EntityTable
            columns={[
              { header: "Title", cell: (row) => row.title ?? "-" },
              { header: "Status", cell: (row) => row.status },
              { header: "Total", cell: (row) => (row.total_amount ? `$${row.total_amount.toFixed(2)}` : "-") },
              { header: "Created", cell: (row) => row.created_at ?? "-" },
            ]}
            data={data}
            emptyMessage="No proposals yet. Add your first proposal above."
          />
        )}
      </div>
    </AppLayout>
  );
}
