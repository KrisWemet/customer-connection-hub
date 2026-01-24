import { supabase, supabaseConfigured } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";
import { validateBooking } from "@/lib/validation/bookings";
import { generateScheduleForBooking } from "@/lib/payments/generator";
import { createScheduleAndIntents } from "@/lib/payments/service";

type VenueSettings = Tables<"venue_settings">;

export type BookingInput = {
  package_type: Tables<"bookings">["package_type"];
  start_date: string; // ISO
  end_date: string; // ISO
  base_price: number;
  client_name: string;
  client_email: string;
  reception_guests?: number;
  camping_guests?: number;
  rv_sites?: number;
  upsell_total?: number;
  notes?: string;
};

export type BookingResult = {
  booking: Tables<"bookings">;
  paymentSchedule: Tables<"payment_schedule">[];
  damageDeposit?: Tables<"damage_deposits">;
  warnings: string[];
};

async function getSettings(): Promise<VenueSettings> {
  const { data, error } = await supabase.from("venue_settings").select("*").limit(1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Venue settings not configured.");
  return data;
}

async function getExistingBookings(): Promise<Pick<Tables<"bookings">, "start_date" | "end_date" | "id">[]> {
  const { data, error } = await supabase.from("bookings").select("id,start_date,end_date");
  if (error) throw error;
  return data ?? [];
}

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  if (!supabaseConfigured) throw new Error("Supabase not configured");

  const settings = await getSettings();
  const existing = await getExistingBookings();

  // Validate
  const validation = validateBooking(
    {
      package_type: input.package_type,
      start_date: input.start_date,
      end_date: input.end_date,
      reception_guests: input.reception_guests,
      camping_guests: input.camping_guests,
      rv_sites: input.rv_sites,
    },
    { settings, existing },
  );
  if (validation.errors.length) {
    const err = new Error("Booking validation failed");
    (err as any).details = validation.errors;
    throw err;
  }

  // Insert booking
  const now = new Date().toISOString();
  const { data: bookingRow, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      package_type: input.package_type,
      start_date: input.start_date,
      end_date: input.end_date,
      base_price: input.base_price,
      status: "pending_contract",
      is_last_minute: validation.isLastMinute,
      estimated_day_guests: input.reception_guests ?? null,
      estimated_overnight_guests: input.camping_guests ?? null,
      rv_sites: input.rv_sites ?? null,
      client_name: input.client_name,
      client_email: input.client_email,
      special_requests: input.notes ?? null,
    })
    .select("*")
    .maybeSingle();
  if (bookingError || !bookingRow) {
    throw bookingError ?? new Error("Failed to create booking");
  }

  try {
    // Payment schedule + Stripe intents
    const scheduleRows = await createScheduleAndIntents({
      booking: bookingRow,
      settings,
      bookingDate: now.slice(0, 10),
      upsellTotal: input.upsell_total ?? 0,
      currency: "cad",
    });

    // Damage deposit
    const depositPayload = {
      booking_id: bookingRow.id,
      amount: settings.damage_deposit_amount ?? 500,
      status: "pending",
      notes: null as string | null,
    };
    const { data: deposit, error: depositError } = await supabase
      .from("damage_deposits")
      .insert(depositPayload)
      .select("*")
      .maybeSingle();
    if (depositError) {
      throw depositError;
    }

    return {
      booking: bookingRow,
      paymentSchedule: scheduleRows,
      damageDeposit: deposit ?? undefined,
      warnings: validation.warnings,
    };
  } catch (err) {
    // best-effort rollback booking
    await supabase.from("bookings").delete().eq("id", bookingRow.id);
    throw err;
  }
}
