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

const testRunId = `seed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const tag = `[TEST_RUN:${testRunId}]`;

const { data: inquiry, error: inquiryError } = await supabase
  .from("inquiries")
  .insert({
    full_name: "Seed Couple",
    email: "seed.couple@example.com",
    phone: "555-222-3333",
    source: "seed",
    status: "inquiry",
    notes: `Seed script ${tag}`,
  })
  .select("id")
  .single();

if (inquiryError || !inquiry) {
  console.error("Failed to seed inquiry", inquiryError);
  process.exit(1);
}

const { data: booking, error: bookingError } = await supabase
  .from("bookings")
  .insert({
    inquiry_id: inquiry.id,
    package_type: "3_day_weekend",
    start_date: "2026-12-05",
    end_date: "2026-12-08",
    base_price: 10000,
    status: "pending_contract",
    special_requests: `Seed booking ${tag}`,
  })
  .select("id")
  .single();

if (bookingError || !booking) {
  console.error("Failed to seed booking", bookingError);
  process.exit(1);
}

console.log(`Seeded inquiry ${inquiry.id} + booking ${booking.id} [${testRunId}]`);
