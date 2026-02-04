import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/types/supabase";

const cardClass = "rounded-2xl border border-border/60 bg-card p-6 shadow-card";

type ContractRow = Tables<"contracts">;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status?: string | null) {
  if (!status) return "Draft";
  return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function ClientContracts() {
  const { user } = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["client_contracts", user?.email],
    enabled: supabaseConfigured && Boolean(user?.email),
    queryFn: async () => {
      if (!user?.email) return [] as ContractRow[];
      const { data: rows, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("client_email", user.email)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (rows ?? []) as ContractRow[];
    },
  });

  return (
    <AppLayout>
      <div className="px-6 py-10 lg:px-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Contracts
            </p>
            <h1 className="text-3xl font-semibold text-foreground">Review your agreements</h1>
            <p className="text-sm text-muted-foreground">
              View contract status and sign anything thats pending.
            </p>
          </div>

          <SupabaseNotice title="Supabase not configured for client contracts." />

          {isLoading ? (
            <TableSkeleton rows={3} />
          ) : data.length === 0 ? (
            <div className={cardClass}>
              <h2 className="text-lg font-semibold text-foreground">No contracts yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Well post your agreement here as soon as its ready.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((contract) => (
                <div key={contract.id} className={cardClass}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contract #{contract.contract_number ?? "—"}</p>
                      <h2 className="mt-1 text-lg font-semibold text-foreground">
                        {contract.client_name ?? "Wedding agreement"}
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(contract.event_start_date)} – {formatDate(contract.event_end_date)}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-semibold text-foreground">{statusLabel(contract.status)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {contract.signed_at ? `Signed ${formatDate(contract.signed_at)}` : "Signature pending"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`/contract/sign/${contract.id}`}
                      className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      View & Sign
                    </a>
                    {contract.pdf_url && (
                      <a
                        href={contract.pdf_url}
                        className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
                      >
                        View PDF
                      </a>
                    )}
                    {contract.signed_pdf_url && (
                      <a
                        href={contract.signed_pdf_url}
                        className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground"
                      >
                        Download signed PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
