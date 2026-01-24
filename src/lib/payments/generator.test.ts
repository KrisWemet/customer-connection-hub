import { describe, expect, it } from "vitest";
import { generateScheduleForBooking } from "./generator";

const booking = {
  id: "b1",
  end_date: "2026-07-12",
  is_last_minute: false,
} as any;

const settings: any = {
  package_base_prices: { "3_day_weekend": 5500 },
  payment_offsets: { deposit: 0, second: -90, final: -60 },
  deposit_percent: 0.25,
};

describe("generateScheduleForBooking", () => {
  it("creates 3-part schedule with upsells rolled into final", () => {
    const rows = generateScheduleForBooking(booking, {
      settings,
      bookingDate: "2026-01-01",
      upsellTotal: 300,
    });
    expect(rows).toHaveLength(3);
    const deposit = rows.find((r) => r.installment_order === 1)!;
    const second = rows.find((r) => r.installment_order === 2)!;
    const final = rows.find((r) => r.installment_order === 3)!;
    expect(deposit.amount).toBeCloseTo(1375);
    expect(second.amount).toBeCloseTo(2750);
    expect(final.amount).toBeCloseTo(5500 - 1375 - 2750 + 300);
  });

  it("collapses to single payment when last-minute", () => {
    const rows = generateScheduleForBooking(
      { ...booking, is_last_minute: true } as any,
      {
        settings,
        bookingDate: "2026-07-10",
        upsellTotal: 0,
      },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBeCloseTo(5500);
  });
});
