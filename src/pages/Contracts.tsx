import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { EntityTable } from "@/components/EntityTable";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { TableSkeleton } from "@/components/TableSkeleton";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export default function Contracts() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      if (!supabaseConfigured) {
        return [] as Tables<"contracts">[];
      }
      const { data: rows, error } = await supabase
        .from("contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        throw error;
      }
      return rows ?? [];
    },
    enabled: supabaseConfigured,
  });

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Contracts</span>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Contracts & Waivers</h1>
        </div>

        <SupabaseNotice title="Supabase not configured for contracts." />

        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : (
          <EntityTable
            columns={[
              { header: "Contract", cell: (row) => row.contract_number ?? "-" },
              { header: "Client", cell: (row) => row.client_name ?? "-" },
              { header: "Status", cell: (row) => row.status },
              { header: "Sent", cell: (row) => row.sent_at ?? "-" },
              { header: "Signed", cell: (row) => row.signed_at ?? "-" },
            ]}
            data={data}
            emptyMessage="No contracts yet. Create one from an inquiry."
          />
        )}
      </div>
    </AppLayout>
  );
}
