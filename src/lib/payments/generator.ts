import type { Tables } from "@/types/supabase";
import { calculatePaymentSchedule } from "./calculator";

type VenueSettings = Tables<"venue_settings">;
type Booking = Tables<"bookings">;

export function generateScheduleForBooking(
  booking: Booking,
  opts: {
    settings: VenueSettings;
    bookingDate: string;
    upsellTotal?: number;
  },
) {
  const baseAmount =
    (booking as any).base_price ??
    Number((opts.settings.package_base_prices as Record<string, number>)?.["3_day_weekend"] ?? 0);

  const schedule = calculatePaymentSchedule({
    baseAmount,
    upsellTotal: opts.upsellTotal ?? 0,
    eventDate: booking.end_date,
    bookingDate: opts.bookingDate,
    isLastMinute: booking.is_last_minute ?? false,
    settings: opts.settings,
  });

  return schedule.map((item) => ({
    booking_id: booking.id,
    installment_order: item.installment_order,
    label: item.label,
    amount: item.amount,
    due_date: item.due_date,
    status: "pending",
  }));
}
