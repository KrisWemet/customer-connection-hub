import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { generateScheduleForBooking } from "./generator";
import { statusFromStripeStatus } from "./status";

type VenueSettings = Tables<"venue_settings">;
type Booking = Tables<"bookings">;

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
