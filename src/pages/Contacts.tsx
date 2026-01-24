import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EntityTable } from "@/components/EntityTable";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function Contacts() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    full_name: "",
    email: "",
    phone: "",
    organization: "",
    role: "",
    notes: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      if (!supabaseConfigured) {
        return [] as Tables<"contacts">[];
      }
      const { data: rows, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return rows ?? [];
    },
  });

  const createContact = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: formState.full_name,
        email: formState.email || null,
        phone: formState.phone || null,
        organization: formState.organization || null,
        role: formState.role || null,
        notes: formState.notes || null,
      };
      const { error } = await supabase.from("contacts").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setFormState({
        full_name: "",
        email: "",
        phone: "",
        organization: "",
        role: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
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
          <span>Couples & Vendors</span>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Couples & Vendors</h1>
        </div>

        <SupabaseNotice title="Supabase not configured for contacts." />

        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Add Contact</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!supabaseConfigured || !formState.full_name.trim()) {
                return;
              }
              createContact.mutate();
            }}
          >
            <input
              className={inputClassName}
              placeholder="Full name"
              value={formState.full_name}
              onChange={(event) => setFormState({ ...formState, full_name: event.target.value })}
              required
            />
            <input
              className={inputClassName}
              placeholder="Email"
              value={formState.email}
              onChange={(event) => setFormState({ ...formState, email: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Phone"
              value={formState.phone}
              onChange={(event) => setFormState({ ...formState, phone: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Vendor / Family"
              value={formState.organization}
              onChange={(event) => setFormState({ ...formState, organization: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Role (Couple/Vendor/Family)"
              value={formState.role}
              onChange={(event) => setFormState({ ...formState, role: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Notes"
              value={formState.notes}
              onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                disabled={createContact.isPending || !supabaseConfigured}
              >
                {createContact.isPending ? "Saving..." : "Save Contact"}
              </button>
            </div>
          </form>
        </div>

        <EntityTable
          columns={[
            { header: "Name", cell: (row) => row.full_name },
            { header: "Email", cell: (row) => row.email ?? "-" },
            { header: "Phone", cell: (row) => row.phone ?? "-" },
            { header: "Organization", cell: (row) => row.organization ?? "-" },
            { header: "Role", cell: (row) => row.role ?? "-" },
          ]}
          data={data}
          emptyMessage="No contacts yet. Add your first contact above."
        />
      </div>
    </AppLayout>
  );
}
