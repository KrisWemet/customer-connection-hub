import {
  areIntervalsOverlapping,
  differenceInCalendarDays,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
} from "date-fns";
import type { Enums, Tables } from "@/types/supabase";

export type VenueSettingsShape = {
  season_start: string; // ISO date (YYYY-MM-DD)
  season_end: string; // ISO date
  max_reception_guests: number;
  included_camping_guests: number;
  included_rv_sites: number;
};

export type BookingValidationInput = {
  start_date: string; // ISO date
  end_date: string; // ISO date
  package_type: Enums<"package_type">;
  reception_guests?: number;
  camping_guests?: number;
  rv_sites?: number;
};

export type BookingValidationResult = {
  errors: string[];
  warnings: string[];
  isLastMinute: boolean;
  campingOverage: number;
  rvOverage: number;
};

type ExistingBooking = Pick<Tables<"bookings">, "start_date" | "end_date" | "id">;

export function validateBooking(
  input: BookingValidationInput,
  ctx: { settings: VenueSettingsShape; existing: ExistingBooking[]; now?: Date },
): BookingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const now = ctx.now ?? new Date();

  const start = parseISO(input.start_date);
  const end = parseISO(input.end_date);

  if (isAfter(start, end) || isSameDay(start, end)) {
    errors.push("End date must be after start date.");
  }

  // Season window
  const seasonStart = parseISO(ctx.settings.season_start);
  const seasonEnd = parseISO(ctx.settings.season_end);
  if (isBefore(start, seasonStart) || isAfter(end, seasonEnd)) {
    errors.push("Booking must fall within the operating season (June–September).");
  }

  const startDay = start.getUTCDay();
  const endDay = end.getUTCDay();

  // Package-specific date validation
  switch (input.package_type) {
    case "3_day_weekend": {
      if (!(startDay === 5 && endDay === 0)) {
        errors.push("3-Day Weekend must start on Friday and end on Sunday.");
      }
      break;
    }
    case "5_day_extended": {
      const days = differenceInCalendarDays(end, start) + 1;
      if (days !== 5) {
        errors.push("5-Day Extended must span exactly 5 consecutive days.");
      }
      break;
    }
    case "10_day_experience": {
      const days = differenceInCalendarDays(end, start) + 1;
      if (days !== 10) {
        errors.push("10-Day Experience must span exactly 10 consecutive days.");
      }
      break;
    }
    default:
      errors.push("Unknown package type.");
  }

  // Single inventory / overlap check
  const overlap = ctx.existing.some((b) =>
    areIntervalsOverlapping(
      { start, end },
      { start: parseISO(b.start_date), end: parseISO(b.end_date) },
      { inclusive: true },
    ),
  );
  if (overlap) {
    errors.push("Another booking already exists for this weekend (single-inventory).");
  }
  // Reset buffer: require at least 1-day gap between bookings
  const violatesReset = ctx.existing.some((b) => {
    const otherEnd = parseISO(b.end_date);
    const daysGap = differenceInCalendarDays(start, otherEnd);
    return daysGap >= 0 && daysGap < 1;
  });
  if (violatesReset) {
    errors.push("Insufficient reset time between bookings (need at least 1 full day).");
  }

  // Capacity: reception guests
  if (input.reception_guests && input.reception_guests > ctx.settings.max_reception_guests) {
    errors.push(`Reception guest count exceeds ${ctx.settings.max_reception_guests} cap.`);
  }

  // Camping and RV overage detection (warnings; can be elevated later)
  const campingOverage = Math.max(
    0,
    (input.camping_guests ?? 0) - ctx.settings.included_camping_guests,
  );
  const rvOverage = Math.max(0, (input.rv_sites ?? 0) - ctx.settings.included_rv_sites);
  if (campingOverage > 0) {
    warnings.push(`Camping overage of ${campingOverage} beyond included ${ctx.settings.included_camping_guests}.`);
  }
  if (rvOverage > 0) {
    warnings.push(`RV site overage of ${rvOverage} beyond included ${ctx.settings.included_rv_sites}.`);
  }

  // Last-minute flag (<7 days)
  const daysUntilStart = differenceInCalendarDays(start, now);
  const isLastMinute = daysUntilStart < 7;

  return {
    errors,
    warnings,
    isLastMinute,
    campingOverage,
    rvOverage,
  };
}
