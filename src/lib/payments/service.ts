import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { generateScheduleForBooking } from "./generator";
import { statusFromStripeStatus } from "./status";
import { sendMessage } from "@/lib/messaging/service";

type VenueSettings = Tables<"venue_settings">;
type Booking = Tables<"bookings">;
type Contact = Tables<"contacts">;

export async function createScheduleAndIntents(args: {
  booking: Booking;
  settings: VenueSettings;
  bookingDate: string;
  upsellTotal?: number;
  currency?: string;
  stripeSecretOverride?: string; // optional for local use; MCP server handles real secret
}) {
  const currency = args.currency ?? "cad";

  const scheduleRows = generateScheduleForBooking(args.booking, {
    settings: args.settings,
    bookingDate: args.bookingDate,
    upsellTotal: args.upsellTotal ?? 0,
  });

  // Insert schedule rows first
  const { data: inserted, error: insertError } = await supabase
    .from("payment_schedule")
    .insert(scheduleRows)
    .select("*");
  if (insertError) throw insertError;

  // Create Stripe intents for each installment
  const updatedRows = [];
  for (const row of inserted ?? []) {
    const intent = await createIntentForScheduleRow({
      amount: row.amount,
      currency,
      bookingId: row.booking_id ?? "",
      installmentOrder: row.installment_order,
      description: `${args.booking.id} - ${row.label}`,
      stripeSecretOverride: args.stripeSecretOverride,
    });
    const status = statusFromStripeStatus(intent.status);
    const { data, error } = await supabase
      .from("payment_schedule")
      .update({ stripe_payment_intent_id: intent.id, status })
      .eq("id", row.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    updatedRows.push(data);
  }

  return updatedRows;
}

export async function sendPaymentReminders(args: { bookingId: string; windowDays?: number }) {
  const windowDays = args.windowDays ?? 7;
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, client_name, client_email")
    .eq("id", args.bookingId)
    .maybeSingle();
  if (bookingError || !booking) throw bookingError ?? new Error("Booking not found");
  if (!booking.client_email) throw new Error("Missing client email for reminders");

  const { data: schedule, error: scheduleError } = await supabase
    .from("payment_schedule")
    .select("*")
    .eq("booking_id", args.bookingId)
    .neq("status", "paid")
    .order("due_date", { ascending: true });
  if (scheduleError) throw scheduleError;

  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + windowDays);

  const upcoming = (schedule ?? []).filter((row) => {
    if (!row.due_date) return false;
    const due = new Date(`${row.due_date}T00:00:00`);
    return due <= cutoff;
  });

  if (upcoming.length === 0) {
    return { sent: 0 };
  }

  const contactId = await getOrCreateContact({
    name: booking.client_name ?? "Rustic Retreat Client",
    email: booking.client_email,
  });

  for (const row of upcoming) {
    const due = row.due_date ?? "";
    const amount = Number(row.amount || 0).toFixed(2);
    const subject = `Payment reminder — ${row.label}`;
    const body = `Hi ${booking.client_name ?? "there"},\n\nThis is a friendly reminder that a payment of $${amount} (${row.label}) is due on ${due}.\n\nIf you have any questions, reply anytime.\n\n— Rustic Retreat`;

    await sendMessage({
      contactId,
      channel: "email",
      subject,
      body,
    });
  }

  return { sent: upcoming.length };
}

async function getOrCreateContact(args: { name: string; email: string }): Promise<string> {
  const { data: existing } = await supabase.from("contacts").select("id").eq("email", args.email).maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: args.name,
      email: args.email,
      contact_type: "client",
    })
    .select("id")
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Unable to create contact");
  return data.id;
}

type StripeIntentResult = {
  id: string;
  status: string;
};

async function createIntentForScheduleRow(args: {
  amount: number;
  currency: string;
  bookingId: string;
  installmentOrder: number;
  description: string;
  stripeSecretOverride?: string;
}): Promise<StripeIntentResult> {
  if (import.meta.env.SSR && args.stripeSecretOverride) {
    const { createStripeClient, createPaymentIntent } = await import("./stripe");
    const stripe = createStripeClient(args.stripeSecretOverride);
    const intent = await createPaymentIntent(stripe, {
      amount: args.amount,
      currency: args.currency,
      metadata: { booking_id: args.bookingId, installment_order: String(args.installmentOrder) },
      description: args.description,
    });
    return { id: intent.id, status: intent.status };
  }

  const { data, error } = await supabase.functions.invoke<StripeIntentResult>("stripe-create-payment-intent", {
    body: {
      amount: args.amount,
      currency: args.currency,
      description: args.description,
      metadata: { booking_id: args.bookingId, installment_order: String(args.installmentOrder) },
    },
  });
  if (error) {
    throw error;
  }
  if (!data?.id) {
    throw new Error("Stripe payment intent response missing id.");
  }
  return data;
}
