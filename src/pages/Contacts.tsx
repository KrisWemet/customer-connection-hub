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

export default function Contacts() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    contact_type: "lead",
    notes: "",
  });

  const { data = [], error: contactsError, isLoading } = useQuery({
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

  // Handle query errors
  useEffect(() => {
    if (contactsError) {
      showError(contactsError, "Failed to load contacts");
    }
  }, [contactsError]);

  const createContact = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formState.name.trim(),
        email: formState.email || null,
        phone: formState.phone || null,
        contact_type: formState.contact_type as "lead" | "client" | "vendor",
        notes: formState.notes || null,
      };
      const { error } = await supabase.from("contacts").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setFormState({
        name: "",
        email: "",
        phone: "",
        contact_type: "lead",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      showSuccess("Contact created successfully");
    },
    onError: (error: unknown) => {
      showError(error, "Failed to create contact");
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
              if (!supabaseConfigured || !formState.name.trim()) {
                return;
              }
              createContact.mutate();
            }}
          >
            <input
              className={inputClassName}
              placeholder="Full name"
              value={formState.name}
              onChange={(event) => setFormState({ ...formState, name: event.target.value })}
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
            <select
              className={inputClassName}
              value={formState.contact_type}
              onChange={(event) => setFormState({ ...formState, contact_type: event.target.value })}
            >
              <option value="lead">Lead</option>
              <option value="client">Client</option>
              <option value="vendor">Vendor</option>
            </select>
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

        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : (
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
        )}
      </div>
    </AppLayout>
  );
}
