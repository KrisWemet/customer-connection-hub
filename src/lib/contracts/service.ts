import { supabase } from "@/lib/supabase/client";
import { generateContractHtml, type ContractTemplateData } from "@/lib/contracts/template";
import { generatePdfFromHtml } from "@/lib/contracts/pdf";
import { sendMessage } from "@/lib/messaging/service";
import { createScheduleAndIntents } from "@/lib/payments/service";
import type { Tables } from "@/types/supabase";

type ContractStatus = "draft" | "sent" | "viewed" | "signed" | "expired" | "cancelled";

type ContractRow = {
  id: string;
  inquiry_id?: string | null;
  booking_id?: string | null;
  contract_number: string;
  status: ContractStatus;
  package_type: string;
  event_start_date: string;
  event_end_date: string;
  total_amount: number;
  deposit_amount: number;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  signed_at?: string | null;
  client_ip_address?: string | null;
  client_signature_data?: string | null;
  pdf_url?: string | null;
  signed_pdf_url?: string | null;
  created_at?: string | null;
};

type VenueSettings = Tables<"venue_settings">;
type Booking = Tables<"bookings">;

const CONTRACT_BUCKET = "contracts";

async function fetchVenueSettings(): Promise<VenueSettings | null> {
  const { data, error } = await supabase.from("venue_settings").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getContract(contractId: string) {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Contract not found");
  return data as ContractRow;
}

export async function createContract(args: {
  inquiryId?: string | null;
  bookingId?: string | null;
  packageType: string;
  eventStartDate: string;
  eventEndDate: string;
  totalAmount: number;
  depositAmount: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
}) {
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      inquiry_id: args.inquiryId ?? null,
      booking_id: args.bookingId ?? null,
      package_type: args.packageType,
      event_start_date: args.eventStartDate,
      event_end_date: args.eventEndDate,
      total_amount: args.totalAmount,
      deposit_amount: args.depositAmount,
      client_name: args.clientName,
      client_email: args.clientEmail,
      client_phone: args.clientPhone ?? null,
      status: "draft",
    })
    .select("*")
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Failed to create contract");
  return data as ContractRow;
}

export async function generateContractPDF(contractId: string, options?: { signed?: boolean }) {
  const contract = await getContract(contractId);
  const settings = await fetchVenueSettings();
  const template = buildTemplateData(contract, settings, {
    signature: options?.signed ? contract.client_signature_data : null,
  });

  const html = generateContractHtml(template);
  const blob = await generatePdfFromHtml(html);
  const filename = `${contract.contract_number}${options?.signed ? "-signed" : ""}.pdf`;
  const path = `${contractId}/${filename}`;

  const { error: uploadError } = await supabase.storage.from(CONTRACT_BUCKET).upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from(CONTRACT_BUCKET).getPublicUrl(path);
  const url = publicUrl?.publicUrl ?? "";

  const updatePayload = options?.signed ? { signed_pdf_url: url } : { pdf_url: url };
  await supabase.from("contracts").update(updatePayload).eq("id", contractId);

  return url;
}

export async function sendContract(contractId: string, method: "email" | "sms") {
  const contract = await getContract(contractId);
  const link = `${window.location.origin}/contract/sign/${contractId}`;
  if (!contract.pdf_url) {
    await generateContractPDF(contractId);
  }

  const contactId = await ensureContact(contract);
  const body =
    method === "sms"
      ? `View and sign your contract: ${link}`
      : `Hello ${contract.client_name},\n\nPlease review and sign your contract: ${link}\n\nThank you!`;

  await sendMessage({
    contactId,
    channel: method,
    subject: method === "email" ? `Your Rustic Retreat Contract ${contract.contract_number}` : undefined,
    body,
  });

  await supabase
    .from("contracts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", contractId);
}

export async function markContractViewed(contractId: string) {
  await supabase
    .from("contracts")
    .update({ status: "viewed", viewed_at: new Date().toISOString() })
    .eq("id", contractId);
}

export async function cancelContract(contractId: string) {
  await supabase.from("contracts").update({ status: "cancelled" }).eq("id", contractId);
}

export async function signContract(contractId: string, signatureData: string, ipAddress?: string | null) {
  const signedAt = new Date().toISOString();
  const { error } = await supabase
    .from("contracts")
    .update({
      status: "signed",
      signed_at: signedAt,
      client_signature_data: signatureData,
      client_ip_address: ipAddress ?? null,
    })
    .eq("id", contractId);
  if (error) throw error;

  await generateContractPDF(contractId, { signed: true });
  const contract = await getContract(contractId);

  if (!contract.booking_id) {
    const booking = await createBookingFromContract(contract);
    await supabase.from("contracts").update({ booking_id: booking.id }).eq("id", contractId);
    await supabase.from("inquiries").update({ status: "booked" }).eq("id", contract.inquiry_id ?? "");

    await sendMessage({
      contactId: await ensureContact(contract),
      channel: "email",
      subject: "Your booking is confirmed",
      body: `Hi ${contract.client_name},\n\nYour booking is confirmed. We'll be in touch with next steps.`,
    });
  }
}

function buildTemplateData(
  contract: ContractRow,
  settings: VenueSettings | null,
  options?: { signature?: string | null },
): ContractTemplateData {
  return {
    contractNumber: contract.contract_number,
    createdAt: contract.created_at ?? new Date().toISOString(),
    clientName: contract.client_name,
    clientEmail: contract.client_email,
    clientPhone: contract.client_phone,
    packageType: contract.package_type,
    eventStartDate: contract.event_start_date,
    eventEndDate: contract.event_end_date,
    totalAmount: contract.total_amount,
    depositAmount: contract.deposit_amount,
    gstRate: settings?.gst_rate ?? 0.05,
    signatureImage: options?.signature ?? null,
    signatureName: contract.client_name,
    signedAt: contract.signed_at ?? null,
  };
}

async function ensureContact(contract: ContractRow): Promise<string> {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", contract.client_email)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: contract.client_name,
      email: contract.client_email,
      phone: contract.client_phone,
      contact_type: "client",
      notes: `Contract ${contract.contract_number}`,
    })
    .select("id")
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Unable to create contact");
  return data.id;
}

async function createBookingFromContract(contract: ContractRow): Promise<Booking> {
  const settings = await fetchVenueSettings();
  if (!settings) throw new Error("Venue settings not configured");

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      package_type: contract.package_type,
      start_date: contract.event_start_date,
      end_date: contract.event_end_date,
      base_price: contract.total_amount,
      status: "confirmed",
      client_name: contract.client_name,
      client_email: contract.client_email,
      inquiry_id: contract.inquiry_id ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error || !booking) throw error ?? new Error("Failed to create booking");

  await createScheduleAndIntents({
    booking: booking as Booking,
    settings,
    bookingDate: new Date().toISOString().slice(0, 10),
    upsellTotal: 0,
    currency: "cad",
  });

  await supabase.from("damage_deposits").insert({
    booking_id: booking.id,
    amount: settings.damage_deposit_amount ?? 500,
    status: "pending",
  });

  return booking as Booking;
}
