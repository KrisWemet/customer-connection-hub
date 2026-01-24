import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secret) {
    return new Response(JSON.stringify({ error: "Stripe secret key not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: {
    amount?: number;
    currency?: string;
    customerId?: string;
    description?: string;
    metadata?: Record<string, string>;
  };

  try {
    payload = await req.json();
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return new Response(JSON.stringify({ error: "Invalid amount" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const currency = typeof payload.currency === "string" ? payload.currency : "cad";
  const stripe = new Stripe(secret, { apiVersion: "2024-11-20" });

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      customer: payload.customerId,
      description: payload.description,
      metadata: payload.metadata,
      automatic_payment_methods: { enabled: true },
    });

    return new Response(JSON.stringify({ id: intent.id, status: intent.status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe request failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
