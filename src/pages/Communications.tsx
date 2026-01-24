import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EntityTable } from "@/components/EntityTable";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { integrationConfig } from "@/lib/integrations/config";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

const inputClassName =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";

export default function Communications() {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    channel: "note",
    direction: "outbound",
    subject: "",
    body: "",
  });

  const { data = [] } = useQuery({
    queryKey: ["communication_logs"],
    queryFn: async () => {
      if (!supabaseConfigured) {
        return [] as Tables<"communication_logs">[];
      }
      const { data: rows, error } = await supabase
        .from("communication_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return rows ?? [];
    },
  });

  const createLog = useMutation({
    mutationFn: async () => {
      const payload = {
        channel: formState.channel,
        direction: formState.direction,
        subject: formState.subject || null,
        body: formState.body || null,
        status: "logged",
        provider: null,
      };
      const { error } = await supabase.from("communication_logs").insert(payload);
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      setFormState({ channel: "note", direction: "outbound", subject: "", body: "" });
      queryClient.invalidateQueries({ queryKey: ["communication_logs"] });
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
          <span>Messages</span>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Messages & Reminders</h1>
        </div>

        <SupabaseNotice title="Supabase not configured for communications." />

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Twilio SMS (Primary)</p>
            <p className="text-lg font-semibold text-foreground">
              {integrationConfig.twilio.enabled ? "Connected" : "Placeholder"}
            </p>
            <p className="text-xs text-muted-foreground">Add Twilio keys to enable SMS reminders.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Resend Email (Fallback)</p>
            <p className="text-lg font-semibold text-foreground">
              {integrationConfig.resend.enabled ? "Connected" : "Placeholder"}
            </p>
            <p className="text-xs text-muted-foreground">Add Resend key to enable email.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-sm text-muted-foreground">Stripe Payments</p>
            <p className="text-lg font-semibold text-foreground">
              {integrationConfig.stripe.enabled ? "Connected" : "Placeholder"}
            </p>
            <p className="text-xs text-muted-foreground">Add Stripe key to take deposits.</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Log Communication</h2>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!supabaseConfigured) {
                return;
              }
              createLog.mutate();
            }}
          >
            <input
              className={inputClassName}
              placeholder="Channel (sms/email/call/note)"
              value={formState.channel}
              onChange={(event) => setFormState({ ...formState, channel: event.target.value })}
              required
            />
            <input
              className={inputClassName}
              placeholder="Direction (inbound/outbound)"
              value={formState.direction}
              onChange={(event) => setFormState({ ...formState, direction: event.target.value })}
              required
            />
            <input
              className={inputClassName}
              placeholder="Subject"
              value={formState.subject}
              onChange={(event) => setFormState({ ...formState, subject: event.target.value })}
            />
            <input
              className={inputClassName}
              placeholder="Message"
              value={formState.body}
              onChange={(event) => setFormState({ ...formState, body: event.target.value })}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
                disabled={createLog.isPending || !supabaseConfigured}
              >
                {createLog.isPending ? "Saving..." : "Save Log"}
              </button>
            </div>
          </form>
        </div>

        <EntityTable
          columns={[
            { header: "Channel", cell: (row) => row.channel },
            { header: "Direction", cell: (row) => row.direction },
            { header: "Subject", cell: (row) => row.subject ?? "-" },
            { header: "Status", cell: (row) => row.status ?? "-" },
            { header: "Sent", cell: (row) => row.sent_at ?? row.created_at ?? "-" },
          ]}
          data={data}
          emptyMessage="No communications logged yet."
        />
      </div>
    </AppLayout>
  );
}
