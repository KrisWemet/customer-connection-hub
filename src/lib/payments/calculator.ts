import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import type { Tables } from "@/types/supabase";

type VenueSettings = Tables<"venue_settings">;

export type PaymentScheduleItem = {
  label: string;
  amount: number;
  due_date: string; // ISO date
  installment_order: number;
  isUpsellPortion?: boolean;
};

export type PaymentCalculatorInput = {
  baseAmount: number;
  upsellTotal?: number;
  eventDate: string; // ISO date
  bookingDate: string; // ISO date
  isLastMinute?: boolean;
  settings: Pick<
    VenueSettings,
    | "deposit_percent"
    | "payment_offsets"
    | "upsell_unit_prices"
    | "package_base_prices"
  >;
};

const DEFAULT_OFFSETS = { deposit: 0, second: -90, final: -60 };

export function calculatePaymentSchedule(input: PaymentCalculatorInput): PaymentScheduleItem[] {
  const {
    baseAmount,
    upsellTotal = 0,
    eventDate,
    bookingDate,
    isLastMinute = false,
    settings,
  } = input;

  const offsets = (settings.payment_offsets as any) ?? DEFAULT_OFFSETS;
  const depositPct = Number(settings.deposit_percent ?? 0.25);
  const event = parseISO(eventDate);
  const booking = parseISO(bookingDate);
  const daysUntilEvent = differenceInCalendarDays(event, booking);

  // If <7 days OR explicitly flagged, collect 100% now
  if (isLastMinute || daysUntilEvent < 7) {
    return [
      {
        label: "Full payment",
        amount: round2(baseAmount + upsellTotal),
        due_date: toISO(booking),
        installment_order: 1,
      },
    ];
  }

  const depositAmount = round2(baseAmount * depositPct);
  const secondAmount = round2(baseAmount * 0.5);
  // Final is remainder of base + all upsells
  const finalAmount = round2(baseAmount - depositAmount - secondAmount + upsellTotal);

  return [
    {
      label: "Deposit",
      amount: depositAmount,
      due_date: toISO(addDays(event, offsets.deposit ?? DEFAULT_OFFSETS.deposit)),
      installment_order: 1,
    },
    {
      label: "Payment 2 (90-day)",
      amount: secondAmount,
      due_date: toISO(addDays(event, offsets.second ?? DEFAULT_OFFSETS.second)),
      installment_order: 2,
    },
    {
      label: "Final (60-day + upsells)",
      amount: finalAmount,
      due_date: toISO(addDays(event, offsets.final ?? DEFAULT_OFFSETS.final)),
      installment_order: 3,
      isUpsellPortion: upsellTotal > 0,
    },
  ];
}

function toISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
