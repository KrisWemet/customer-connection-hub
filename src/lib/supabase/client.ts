import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate required environment variables
function validateEnvVars() {
  const missing: string[] = [];

  if (!supabaseUrl) missing.push("VITE_SUPABASE_URL");
  if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY");

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(", ")}.
Please check your .env file and ensure all required variables are set.`;

    // In development, show a friendly error
    if (import.meta.env.DEV) {
      console.error("❌ Configuration Error:", errorMsg);
    }

    throw new Error(errorMsg);
  }
}

// Validate on module load
validateEnvVars();

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'supabase.auth.token',
      flowType: 'pkce'
    }
  }
);
