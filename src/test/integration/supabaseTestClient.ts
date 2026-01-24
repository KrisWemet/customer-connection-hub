import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { loadTestEnv } from "./testEnv";

export function getSupabaseTestClient() {
  loadTestEnv();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase test env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY) in .env.test.local."
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}
