import { supabaseConfigured } from "@/lib/supabase/client";

interface SupabaseNoticeProps {
  title?: string;
}

export function SupabaseNotice({ title = "Supabase not configured" }: SupabaseNoticeProps) {
  if (supabaseConfigured) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">
        Add your Supabase URL and anon key in <span className="font-medium">.env.local</span> to
        enable live data.
      </p>
    </div>
  );
}
