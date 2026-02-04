import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const form = await req.formData();
  const from = (form.get("From") || "").toString();
  const to = (form.get("To") || "").toString();
  const body = (form.get("Body") || "").toString();
  const externalId = (form.get("MessageSid") || "").toString();

  if (!from || !body) {
    return new Response(JSON.stringify({ error: "Missing From/Body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const contactId = await upsertContact({ supabase, phone: from });
  if (!contactId) {
    return new Response(JSON.stringify({ error: "Failed to resolve contact" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const threadId = await upsertThread({ supabase, contactId });
  if (!threadId) {
    return new Response(JSON.stringify({ error: "Failed to resolve thread" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error: msgError } = await supabase.from("messages").insert({
    thread_id: threadId,
    direction: "inbound",
    channel: "sms",
    from_address: from,
    to_address: to || null,
    subject: null,
    body,
    status: "delivered",
    external_id: externalId || null,
    sent_at: new Date().toISOString(),
  });

  if (msgError) {
    return new Response(JSON.stringify({ error: msgError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: 1,
    })
    .eq("id", threadId);

  return new Response("ok", { headers: corsHeaders });
});

async function upsertContact(args: {
  supabase: ReturnType<typeof createClient>;
  phone: string;
}) {
  const { data: existing } = await args.supabase
    .from("contacts")
    .select("id")
    .eq("phone", args.phone)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await args.supabase
    .from("contacts")
    .insert({
      name: "Inbound SMS",
      phone: args.phone,
      contact_type: "lead",
    })
    .select("id")
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

async function upsertThread(args: {
  supabase: ReturnType<typeof createClient>;
  contactId: string;
}) {
  const { data: existing } = await args.supabase
    .from("message_threads")
    .select("id")
    .eq("contact_id", args.contactId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await args.supabase
    .from("message_threads")
    .insert({
      contact_id: args.contactId,
      subject: null,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })
    .select("id")
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}
