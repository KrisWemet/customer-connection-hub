import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EntityTable } from "@/components/EntityTable";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { MERGE_FIELDS, applyMergeFields } from "@/lib/messaging/mergeFields";

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function Templates() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    name: "",
    type: "email",
    template_key: "general",
    subject: "",
    body: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      if (!supabaseConfigured) {
        return [] as Tables<"templates">[];
      }
      const { data: rows, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return rows ?? [];
    },
    enabled: supabaseConfigured,
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formState.name,
        type: formState.type,
        template_key: formState.template_key,
        subject: formState.subject || null,
        body: formState.body || null,
      };
      const { error } = await supabase.from("templates").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setFormState({ name: "", type: "email", template_key: "general", subject: "", body: "" });
      queryClient.invalidateQueries({ queryKey: ["templates"] });
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
          <span>Templates</span>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Message & Document Templates</h1>
        </div>

        <SupabaseNotice title="Supabase not configured for templates." />

        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Merge Fields</h2>
          <p className="text-sm text-muted-foreground">
            Use double curly braces in templates, e.g. <code>{{"{{client_name}}"}}</code>.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            {MERGE_FIELDS.map((field) => (
              <span key={field} className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
                {{"{{"}}{field}{{"}}"}}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Add Template</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!supabaseConfigured || !formState.name.trim()) {
                return;
              }
              createTemplate.mutate();
            }}
          >
            <input
              className={inputClassName}
              placeholder="Name"
              value={formState.name}
              onChange={(event) => setFormState({ ...formState, name: event.target.value })}
              required
            />
            <select
              className={inputClassName}
              value={formState.template_key}
              onChange={(event) => setFormState({ ...formState, template_key: event.target.value })}
            >
              <option value="contract_sent">Contract Sent</option>
              <option value="tour_confirmation">Tour Confirmation</option>
              <option value="payment_reminder">Payment Reminder</option>
              <option value="payment_overdue">Payment Overdue</option>
              <option value="booking_confirmation">Booking Confirmation</option>
              <option value="general">General</option>
            </select>
            <input
              className={inputClassName}
              placeholder="Type (email/sms/document)"
              value={formState.type}
              onChange={(event) => setFormState({ ...formState, type: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Subject"
              value={formState.subject}
              onChange={(event) => setFormState({ ...formState, subject: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Body"
              value={formState.body}
              onChange={(event) => setFormState({ ...formState, body: event.target.value })}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                disabled={createTemplate.isPending || !supabaseConfigured}
              >
                {createTemplate.isPending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </form>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Template Preview</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Preview the current subject/body with sample data.
          </p>
          <div className="rounded-lg border border-border bg-background p-4 text-sm space-y-2">
            <div className="font-semibold">Subject</div>
            <div>
              {applyMergeFields(formState.subject || "", {
                client_name: "Alex + Jamie",
                event_date: "2026-09-18",
                venue_name: "Rustic Retreat",
                payment_amount: "$2,500",
                payment_due_date: "2026-06-18",
                tour_date: "2026-05-01",
                tour_time: "2:00 PM",
              }) || "(no subject)"}
            </div>
            <div className="font-semibold">Body</div>
            <div>
              {applyMergeFields(formState.body || "", {
                client_name: "Alex + Jamie",
                event_date: "2026-09-18",
                venue_name: "Rustic Retreat",
                payment_amount: "$2,500",
                payment_due_date: "2026-06-18",
                tour_date: "2026-05-01",
                tour_time: "2:00 PM",
              }) || "(no body)"}
            </div>
          </div>
        </div>

        <EntityTable
          columns={[
            { header: "Name", cell: (row) => row.name },
            { header: "Key", cell: (row) => row.template_key ?? "general" },
            { header: "Type", cell: (row) => row.type },
            { header: "Subject", cell: (row) => row.subject ?? "-" },
          ]}
          data={data}
          emptyMessage="No templates yet. Add your first template above."
        />
      </div>
    </AppLayout>
  );
}
