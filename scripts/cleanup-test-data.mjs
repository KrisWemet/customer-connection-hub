import { config as loadDotEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envCandidates = [".env.test.local", ".env.test", ".env.local", ".env"];
for (const filename of envCandidates) {
  const filepath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(filepath)) {
    loadDotEnv({ path: filepath, override: false });
  }
}

const testRunId = process.argv[2];
if (!testRunId) {
  console.error("Usage: node scripts/cleanup-test-data.mjs <testRunId>");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const tag = `[TEST_RUN:${testRunId}]`;

await supabase.from("contracts").delete().ilike("signed_pdf_url", `%${tag}%`);
await supabase.from("invoices").delete().ilike("provider_invoice_id", `%${tag}%`);
await supabase.from("communication_logs").delete().ilike("subject", `%${tag}%`);
await supabase.from("templates").delete().ilike("name", `%${tag}%`);
await supabase.from("proposals").delete().ilike("title", `%${tag}%`);
await supabase.from("calendar_blocks").delete().ilike("label", `%${tag}%`);
await supabase.from("contacts").delete().ilike("notes", `%${tag}%`);
await supabase.from("bookings").delete().ilike("special_requests", `%${tag}%`);
await supabase.from("inquiries").delete().ilike("notes", `%${tag}%`);

console.log(`Cleanup complete for ${testRunId}`);
