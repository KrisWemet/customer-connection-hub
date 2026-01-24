import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import { getPackageEndDate } from "@/lib/bookingRules";

const insertMock = vi.fn().mockResolvedValue({ error: null });
const fromMock = vi.fn().mockReturnValue({
  insert: insertMock,
});

vi.mock("@/lib/supabase/client", () => ({
  supabaseConfigured: true,
  supabase: {
    from: fromMock,
  },
}));

function BookingForm() {
  const navigate = useNavigate();
  const [packageType, setPackageType] = useState("3-day");
  const [startDate, setStartDate] = useState("2026-09-18");
  return (
    <div>
      <h1>Create Booking</h1>
      <input
        aria-label="package-type"
        value={packageType}
        onChange={(event) => setPackageType(event.target.value)}
      />
      <input
        aria-label="start-date"
        value={startDate}
        onChange={(event) => setStartDate(event.target.value)}
      />
      <button
        onClick={async () => {
          const computedEnd = getPackageEndDate(
            packageType as "3-day",
            new Date(startDate)
          )
            .toISOString()
            .slice(0, 10);

          const { supabase } = await import("@/lib/supabase/client");
          await supabase.from("bookings").insert({
            package_type: packageType,
            start_date: startDate,
            end_date: computedEnd,
            base_price: 12000,
            status: "pending_contract",
          });
          navigate("/bookings/confirm");
        }}
      >
        Save Booking
      </button>
    </div>
  );
}

function Confirmation() {
  return <h1>Booking saved</h1>;
}

describe("smoke: booking creation flow", () => {
  it("computes end date and calls Supabase insert", async () => {
    render(
      <MemoryRouter initialEntries={["/bookings/new"]}>
        <Routes>
          <Route path="/bookings/new" element={<BookingForm />} />
          <Route path="/bookings/confirm" element={<Confirmation />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Booking" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Booking saved" })).toBeInTheDocument();
    });

    const expectedEnd = getPackageEndDate("3-day", new Date("2026-09-18"))
      .toISOString()
      .slice(0, 10);

    expect(fromMock).toHaveBeenCalledWith("bookings");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        package_type: "3-day",
        start_date: "2026-09-18",
        end_date: expectedEnd,
        base_price: 12000,
        status: "pending_contract",
      })
    );
  });
});
