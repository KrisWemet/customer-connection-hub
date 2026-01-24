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
    expect(getPackageNights("2-day")).toBe(2);
    expect(getPackageNights("3-day")).toBe(3);
    expect(getPackageNights("5-day")).toBe(5);
  });

  it("validates start days per package", () => {
    expect(isValidStartDay("2-day", new Date("2026-06-09"))).toBe(true); // Tue
    expect(isValidStartDay("2-day", new Date("2026-06-10"))).toBe(true); // Wed
    expect(isValidStartDay("2-day", new Date("2026-06-11"))).toBe(false); // Thu
    expect(isValidStartDay("3-day", new Date("2026-06-12"))).toBe(true); // Fri
    expect(isValidStartDay("3-day", new Date("2026-06-13"))).toBe(false); // Sat
    expect(isValidStartDay("5-day", new Date("2026-06-10"))).toBe(true); // Wed
    expect(isValidStartDay("5-day", new Date("2026-06-11"))).toBe(true); // Thu
  });

  it("calculates package end dates", () => {
    const start = new Date("2026-06-10");
    expect(getPackageEndDate("2-day", start).toISOString().slice(0, 10)).toBe("2026-06-12");
    expect(getPackageEndDate("3-day", start).toISOString().slice(0, 10)).toBe("2026-06-13");
  });

  it("returns prep/teardown dates for 5-day packages", () => {
    const start = new Date("2026-06-10");
    const { prepDays, teardownDays } = getPrepTeardownDates(start, "5-day");
    expect(prepDays).toHaveLength(2);
    expect(teardownDays).toHaveLength(2);
  });

  it("enforces minimum reset gap", () => {
    const end = new Date("2026-06-15");
    expect(hasMinimumResetGap(end, new Date("2026-06-16"))).toBe(true);
    expect(hasMinimumResetGap(end, new Date("2026-06-15"))).toBe(false);
  });
});
