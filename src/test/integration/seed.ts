import { getSupabaseTestClient } from "./supabaseTestClient";

export interface SeededRecords {
  testRunId: string;
  inquiryId: string;
  bookingId: string;
}

export async function seedTestData(): Promise<SeededRecords> {
  const supabase = getSupabaseTestClient();
  const testRunId = `test_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tag = `[TEST_RUN:${testRunId}]`;

  const { data: inquiry, error: inquiryError } = await supabase
    .from("inquiries")
    .insert({
      full_name: "Test Couple",
      email: "test.couple@example.com",
      phone: "555-555-5555",
      source: "website",
      status: "inquiry",
      notes: `Seed inquiry ${tag}`,
    })
    .select("id")
    .single();

  if (inquiryError || !inquiry) {
    throw new Error(`Failed to seed inquiry: ${inquiryError?.message}`);
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      inquiry_id: inquiry.id,
      package_type: "3_day_weekend",
      start_date: "2026-09-18",
      end_date: "2026-09-21",
      base_price: 12000,
      status: "pending_contract",
      special_requests: `Seed booking ${tag}`,
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    throw new Error(`Failed to seed booking: ${bookingError?.message}`);
  }

  return { testRunId, inquiryId: inquiry.id, bookingId: booking.id };
}

export async function cleanupTestData(testRunId: string) {
  const supabase = getSupabaseTestClient();
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
}
