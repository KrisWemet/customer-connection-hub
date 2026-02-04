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

  let payload: {
    full_name?: string;
    email?: string;
    phone?: string;
    source?: string;
    status?: string;
    event_start_date?: string;
    event_end_date?: string;
    estimated_guest_count?: number;
    notes?: string;
    lead_type?: string;
  };

  try {
    payload = await req.json();
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!payload.full_name) {
    return new Response(JSON.stringify({ error: "full_name is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Auto-create client account if email provided
  let userId: string | null = null;
  if (payload.email) {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", payload.email.toLowerCase())
      .maybeSingle();

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new auth user with service role
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: payload.email.toLowerCase(),
        email_confirm: false, // They'll need to set password via invite/reset
        user_metadata: {
          full_name: payload.full_name,
        },
      });

      if (authError) {
        console.error("Auth user creation error:", authError);
      } else if (authUser?.user) {
        userId = authUser.user.id;

        // Create user profile as client
        const { error: profileError } = await supabase.from("user_profiles").insert({
          id: userId,
          email: payload.email.toLowerCase(),
          name: payload.full_name,
          role: "client",
        });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }
    }
  }

  // Create the inquiry
  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      full_name: payload.full_name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      source: payload.source ?? null,
      status: payload.status ?? "inquiry",
      event_start_date: payload.event_start_date ?? null,
      event_end_date: payload.event_end_date ?? null,
      estimated_guest_count: payload.estimated_guest_count ?? null,
      notes: payload.notes ?? payload.lead_type ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ 
    id: data?.id ?? "unknown",
    account_created: !!userId,
    message: userId 
      ? "Inquiry submitted. A client account has been created. Check your email to set your password."
      : "Inquiry submitted successfully."
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
