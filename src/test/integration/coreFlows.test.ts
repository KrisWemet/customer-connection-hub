import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getSupabaseTestClient } from "./supabaseTestClient";
import { cleanupTestData, seedTestData } from "./seed";

describe("CRM core flows (integration)", () => {
  const supabase = getSupabaseTestClient();
  let testRunId = "";
  let baseInquiryId = "";
  let baseBookingId = "";

  beforeAll(async () => {
    const seed = await seedTestData();
    testRunId = seed.testRunId;
    baseInquiryId = seed.inquiryId;
    baseBookingId = seed.bookingId;
  });

  afterAll(async () => {
    if (testRunId) {
      await cleanupTestData(testRunId);
    }
  });

  it("creates and reads an inquiry", async () => {
    const tag = `[TEST_RUN:${testRunId}]`;
    const { data, error } = await supabase
      .from("inquiries")
      .insert({
        full_name: "Taylor + Jordan",
        email: "taylor.jordan@example.com",
        phone: "555-000-1111",
        source: "instagram",
        status: "inquiry",
        notes: `Integration inquiry ${tag}`,
      })
      .select("id, full_name, status, notes")
      .single();

    expect(error).toBeNull();
    expect(data?.full_name).toBe("Taylor + Jordan");
    expect(data?.status).toBe("inquiry");
    expect(data?.notes).toContain(tag);
  });

  it("creates a booking linked to an inquiry", async () => {
    const tag = `[TEST_RUN:${testRunId}]`;
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        inquiry_id: baseInquiryId,
        package_type: "5_day_extended",
        start_date: "2026-10-01",
        end_date: "2026-10-06",
        base_price: 15500,
        status: "pending_contract",
        special_requests: `Integration booking ${tag}`,
      })
      .select("id, inquiry_id")
      .single();

    expect(error).toBeNull();
    expect(data?.inquiry_id).toBe(baseInquiryId);
  });

  it("creates an availability block", async () => {
    const tag = `[TEST_RUN:${testRunId}]`;
    const { data, error } = await supabase
      .from("calendar_blocks")
      .insert({
        type: "hold",
        start_date: "2026-11-12",
        end_date: "2026-11-14",
        label: `Integration hold ${tag}`,
        notes: "Test availability block",
      })
      .select("id, type, label")
      .single();

    expect(error).toBeNull();
    expect(data?.type).toBe("hold");
    expect(data?.label).toContain(tag);
  });

  it("creates an invoice and marks it paid", async () => {
    const tag = `[TEST_RUN:${testRunId}]`;
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        booking_id: baseBookingId,
        amount: 2500,
        status: "sent",
        provider_invoice_id: `inv_${tag}`,
      })
      .select("id, status")
      .single();

    expect(invoiceError).toBeNull();
    expect(invoice?.status).toBe("sent");

    const { data: updated, error: updateError } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", invoice?.id ?? "")
      .select("status, paid_at")
      .single();

    expect(updateError).toBeNull();
    expect(updated?.status).toBe("paid");
    expect(updated?.paid_at).toBeTruthy();
  });

  it("creates a contract record for a booking", async () => {
    const tag = `[TEST_RUN:${testRunId}]`;
    const { data, error } = await supabase
      .from("contracts")
      .insert({
        booking_id: baseBookingId,
        status: "sent",
        signed_pdf_url: `https://example.com/contracts/${tag}`,
        client_ip_address: "127.0.0.1",
      })
      .select("id, status, booking_id")
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("sent");
    expect(data?.booking_id).toBe(baseBookingId);
  });
});
