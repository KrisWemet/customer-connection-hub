import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: { window_days?: number };
  try {
    payload = await req.json();
  } catch (_err) {
    payload = {};
  }

  const windowDays = Math.max(1, Math.min(30, payload.window_days ?? 7));
  const now = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + windowDays);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: schedule, error } = await supabase
    .from("payment_schedule")
    .select("id, booking_id, label, amount, due_date, status")
    .neq("status", "paid")
    .order("due_date", { ascending: true });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const dueSoon = (schedule ?? []).filter((row) => {
    if (!row.due_date) return false;
    const due = toDate(row.due_date);
    return due >= now && due <= cutoff;
  });

  let sent = 0;
  for (const row of dueSoon) {
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, client_name, client_email")
      .eq("id", row.booking_id)
      .maybeSingle();
    if (bookingError || !booking?.client_email) continue;

    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", booking.client_email)
      .maybeSingle();

    let contactId = existingContact?.id ?? null;
    if (!contactId) {
      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert({
          name: booking.client_name ?? "Rustic Retreat Client",
          email: booking.client_email,
          contact_type: "client",
        })
        .select("id")
        .maybeSingle();
      if (contactError || !newContact?.id) continue;
      contactId = newContact.id;
    }

    let subject = `Payment reminder — ${row.label}`;
    const amount = Number(row.amount || 0).toFixed(2);
    let body = `Hi ${booking.client_name ?? "there"},\n\nThis is a friendly reminder that a payment of $${amount} (${row.label}) is due on ${row.due_date}.\n\nIf you have any questions, reply anytime.\n\n— Rustic Retreat`;

    const { data: template } = await supabase
      .from("templates")
      .select("subject, body")
      .eq("template_key", "payment_reminder")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (template?.subject || template?.body) {
      const apply = (text: string) =>
        text
          .replace(/{{\s*client_name\s*}}/gi, booking.client_name ?? "")
          .replace(/{{\s*payment_amount\s*}}/gi, `$${amount}`)
          .replace(/{{\s*payment_due_date\s*}}/gi, row.due_date ?? "")
          .replace(/{{\s*venue_name\s*}}/gi, "Rustic Retreat");
      if (template.subject) subject = apply(template.subject);
      if (template.body) body = apply(template.body);
    }

    const { error: msgError } = await supabase.from("messages").insert({
      thread_id: null,
      direction: "outbound",
      channel: "email",
      from_address: null,
      to_address: booking.client_email,
      subject,
      body,
      status: "sent",
      external_id: null,
      sent_by: null,
      sent_at: new Date().toISOString(),
    });

    if (!msgError) sent += 1;
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
