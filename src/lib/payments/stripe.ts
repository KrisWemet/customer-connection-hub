import Stripe from "stripe";
import type { Tables } from "@/types/supabase";
import { statusFromStripeStatus } from "./status";

// Stripe MCP server is expected to be available; this client is for type safety and local fallback.
// In Codex CLI, the MCP Stripe server manages auth; here we pass the secret for non-MCP environments.
export function createStripeClient(secret?: string) {
  const key = secret ?? process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Stripe secret key not configured");
  }
  return new Stripe(key, {
    apiVersion: "2024-11-20",
  });
}

export type PaymentIntentInput = {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
};

export async function createPaymentIntent(
  stripe: Stripe,
  input: PaymentIntentInput,
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.create({
    amount: Math.round(input.amount * 100),
    currency: input.currency,
    customer: input.customerId,
    description: input.description,
    metadata: input.metadata,
    automatic_payment_methods: { enabled: true },
  });
}

export async function attachPaymentMethod(
  stripe: Stripe,
  customerId: string,
  paymentMethodId: string,
): Promise<void> {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
}

export type ScheduleRow = Tables<"payment_schedule">;

export function statusFromIntent(intent: Stripe.PaymentIntent): string {
  return statusFromStripeStatus(intent.status);
}
