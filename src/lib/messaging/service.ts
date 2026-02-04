import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

type Contact = Tables<"contacts">;
type Thread = Tables<"message_threads">;
type Message = Tables<"messages">;

export async function sendMessage(args: {
  contactId: string;
  channel: "sms" | "email";
  subject?: string;
  body: string;
  fromAddress?: string;
  toAddress?: string;
  sentBy?: string;
}) {
  // fetch contact
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", args.contactId)
    .maybeSingle();
  if (contactError || !contact) throw contactError ?? new Error("Contact not found");

  // ensure thread
  const thread = await upsertThread(contact.id, args.subject);

  // send
  let externalId: string | undefined;
  if (args.channel === "sms") {
    const to = args.toAddress ?? contact.phone;
    if (!to) throw new Error("Missing phone number for SMS");
    const res = await sendSmsViaEdge(to, args.body);
    externalId = res.id;
  } else {
    const to = args.toAddress ?? contact.email;
    if (!to) throw new Error("Missing email for message");
    const res = await sendEmailViaEdge(to, args.subject ?? "(no subject)", args.body);
    externalId = res.id;
  }

  // store message
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      thread_id: thread.id,
      direction: "outbound",
      channel: args.channel,
      from_address: args.fromAddress ?? null,
      to_address: args.channel === "sms" ? contact.phone : contact.email,
      subject: args.subject ?? null,
      body: args.body,
      status: "sent",
      external_id: externalId ?? null,
      sent_by: args.sentBy ?? null,
      sent_at: new Date().toISOString(),
    })
    .select("*")
    .maybeSingle();
  if (msgError) throw msgError;

  // update thread
  await supabase
    .from("message_threads")
    .update({ last_message_at: new Date().toISOString(), unread_count: 0 })
    .eq("id", thread.id);

  return msg;
}

async function upsertThread(contactId: string, subject?: string): Promise<Thread> {
  // try existing
  const { data: existing } = await supabase
    .from("message_threads")
    .select("*")
    .eq("contact_id", contactId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabase
    .from("message_threads")
    .insert({
      contact_id: contactId,
      subject: subject ?? null,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })
    .select("*")
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Failed to create thread");
  return data;
}

export async function getThreads(contactId?: string) {
  const query = supabase.from("message_threads").select("*, contacts(*)").order("last_message_at", { ascending: false });
  if (contactId) query.eq("contact_id", contactId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getMessages(threadId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function markAsRead(threadId: string) {
  const { error } = await supabase.from("messages").update({ status: "read" }).eq("thread_id", threadId);
  if (error) throw error;
  await supabase.from("message_threads").update({ unread_count: 0 }).eq("id", threadId);
}

type EdgeSendResult = {
  id: string;
  status?: string;
};

async function sendSmsViaEdge(to: string, body: string): Promise<EdgeSendResult> {
  const { data, error } = await supabase.functions.invoke<EdgeSendResult>("send-sms", {
    body: { to, body },
  });
  if (error) throw error;
  if (!data?.id) throw new Error("SMS send failed");
  return data;
}

async function sendEmailViaEdge(to: string, subject: string, html: string): Promise<EdgeSendResult> {
  const { data, error } = await supabase.functions.invoke<EdgeSendResult>("send-email", {
    body: { to, subject, html },
  });
  if (error) throw error;
  if (!data?.id) throw new Error("Email send failed");
  return data;
}

export async function sendTestSms(to: string, body: string): Promise<EdgeSendResult> {
  return sendSmsViaEdge(to, body);
}

export async function sendTestEmail(to: string, subject: string, html: string): Promise<EdgeSendResult> {
  return sendEmailViaEdge(to, subject, html);
}

// Utility to store inbound messages (to be used by webhook handlers later)
export async function storeInboundMessage(args: {
  contactId: string;
  channel: "sms" | "email" | "facebook_messenger";
  from: string;
  to: string;
  subject?: string | null;
  body: string;
  externalId?: string | null;
}) {
  const thread = await upsertThread(args.contactId, args.subject ?? undefined);
  const { error } = await supabase.from("messages").insert({
    thread_id: thread.id,
    direction: "inbound",
    channel: args.channel,
    from_address: args.from,
    to_address: args.to,
    subject: args.subject ?? null,
    body: args.body,
    status: "delivered",
    external_id: args.externalId ?? null,
    sent_at: new Date().toISOString(),
  });
  if (error) throw error;
  await supabase
    .from("message_threads")
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: (thread.unread_count ?? 0) + 1,
    })
    .eq("id", thread.id);
}
