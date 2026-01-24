import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { SupabaseNotice } from "@/components/SupabaseNotice";
import { supabase, supabaseConfigured } from "@/lib/supabase/client";

interface ReportSummary {
  inquiries: number;
  bookings: number;
  payments: number;
  contracts: number;
}

export default function Reports() {
  const { data } = useQuery({
    queryKey: ["report_summary"],
    queryFn: async (): Promise<ReportSummary> => {
      if (!supabaseConfigured) {
        return { inquiries: 0, bookings: 0, payments: 0, contracts: 0 };
      }

      const fetchCount = async (table: string) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        try {
          const { count, error } = await supabase
            .from(table)
            .select("id", { count: "exact", head: true, signal: controller.signal });
          if (error) throw error;
          return count ?? 0;
        } catch (error) {
          console.warn(`Reports count fetch failed for ${table}:`, error);
          return 0;
        } finally {
          clearTimeout(timer);
        }
      };

      const [inquiries, bookings, payments, contracts] = await Promise.all([
        fetchCount("inquiries"),
        fetchCount("bookings"),
        fetchCount("invoices"),
        fetchCount("contracts"),
      ]);

      return { inquiries, bookings, payments, contracts };
    },
    enabled: supabaseConfigured,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <AppLayout>
      <div className="p-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <a href="/" className="hover:text-primary">
            Home
          </a>
          <span>//</span>
          <span>Reports</span>
        </div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-primary">Insights & Reports</h1>
        </div>

        <SupabaseNotice title="Supabase not configured for reports." />

        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Inquiries</p>
            <p className="text-3xl font-semibold text-foreground">{data?.inquiries ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Bookings</p>
            <p className="text-3xl font-semibold text-foreground">{data?.bookings ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Payments</p>
            <p className="text-3xl font-semibold text-foreground">{data?.payments ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">Contracts</p>
            <p className="text-3xl font-semibold text-foreground">{data?.contracts ?? 0}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
