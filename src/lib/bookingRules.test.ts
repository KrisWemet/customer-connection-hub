import { describe, it, expect } from "vitest";
import {
  getPackageNights,
  getPackageEndDate,
  getPrepTeardownDates,
  hasMinimumResetGap,
  isValidStartDay,
} from "./bookingRules";

describe("booking rules", () => {
  it("returns correct package nights", () => {
    expect(getPackageNights("3_day_weekend")).toBe(3);
    expect(getPackageNights("5_day_extended")).toBe(5);
    expect(getPackageNights("10_day_experience")).toBe(10);
  });

  it("validates start days per package", () => {
    expect(isValidStartDay("3_day_weekend", new Date("2026-06-12"))).toBe(true); // Fri
    expect(isValidStartDay("3_day_weekend", new Date("2026-06-13"))).toBe(false); // Sat
    expect(isValidStartDay("5_day_extended", new Date("2026-06-11"))).toBe(true); // Thu
    expect(isValidStartDay("10_day_experience", new Date("2026-06-11"))).toBe(true); // Wed
  });

  it("calculates package end dates", () => {
    const start = new Date("2026-06-10");
    expect(getPackageEndDate("3_day_weekend", start).toISOString().slice(0, 10)).toBe("2026-06-13");
    expect(getPackageEndDate("5_day_extended", start).toISOString().slice(0, 10)).toBe("2026-06-15");
  });

  it("returns prep/teardown dates for 5-day packages", () => {
    const start = new Date("2026-06-10");
    const { prepDays, teardownDays } = getPrepTeardownDates(start, "5_day_extended");
    expect(prepDays).toHaveLength(2);
    expect(teardownDays).toHaveLength(2);
  });

  it("enforces minimum reset gap", () => {
    const end = new Date("2026-06-15");
    expect(hasMinimumResetGap(end, new Date("2026-06-16"))).toBe(true);
    expect(hasMinimumResetGap(end, new Date("2026-06-15"))).toBe(false);
  });
});
