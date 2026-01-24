import { describe, expect, it, vi } from "vitest";
import { validateBooking } from "./bookings";

const settings = {
  season_start: "2026-06-01",
  season_end: "2026-09-30",
  max_reception_guests: 150,
  included_camping_guests: 60,
  included_rv_sites: 15,
};

const friday = "2026-07-10"; // Friday
const sunday = "2026-07-12"; // Sunday

describe("validateBooking", () => {
  it("passes a valid weekend booking inside season", () => {
    const res = validateBooking(
      {
        start_date: friday,
        end_date: sunday,
        package_type: "3_day_weekend",
        reception_guests: 120,
        camping_guests: 50,
        rv_sites: 10,
      },
      { settings, existing: [] },
    );
    expect(res.errors).toEqual([]);
    expect(res.isLastMinute).toBe(false);
    expect(res.campingOverage).toBe(0);
    expect(res.rvOverage).toBe(0);
  });

  it("flags out-of-season dates", () => {
    const res = validateBooking(
      {
        start_date: "2026-10-02",
        end_date: "2026-10-04",
        package_type: "3_day_weekend",
      },
      { settings, existing: [] },
    );
    expect(res.errors).toContain("Booking must fall within the operating season (June–September).");
  });

  it("requires Friday start and Sunday end", () => {
    const res = validateBooking(
      {
        start_date: "2026-07-09", // Thursday
        end_date: sunday,
        package_type: "3_day_weekend",
      },
      { settings, existing: [] },
    );
    expect(res.errors).toContain("Package must start on Friday and end on Sunday.");
  });

  it("blocks overlap with existing booking", () => {
    const res = validateBooking(
      {
        start_date: friday,
        end_date: sunday,
        package_type: "3_day_weekend",
      },
      {
        settings,
        existing: [{ id: "1", start_date: "2026-07-10", end_date: "2026-07-12" }],
      },
    );
    expect(res.errors).toContain("Another booking already exists for this weekend (single-inventory).");
  });

  it("enforces guest capacity and detects overages", () => {
    const res = validateBooking(
      {
        start_date: friday,
        end_date: sunday,
        package_type: "3_day_weekend",
        reception_guests: 160,
        camping_guests: 75,
        rv_sites: 20,
      },
      { settings, existing: [] },
    );
    expect(res.errors).toContain("Reception guest count exceeds 150 cap.");
    expect(res.warnings).toContain("Camping overage of 15 beyond included 60.");
    expect(res.warnings).toContain("RV site overage of 5 beyond included 15.");
  });

  it("flags last-minute bookings under 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
    const res = validateBooking(
      {
        start_date: friday, // 6 days away from mocked now
        end_date: sunday,
        package_type: "3_day_weekend",
      },
      { settings, existing: [] },
    );
    expect(res.isLastMinute).toBe(true);
    vi.useRealTimers();
  });
});
