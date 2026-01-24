import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Contacts from "@/pages/Contacts";

const insertMock = vi.fn().mockResolvedValue({ error: null });
const orderMock = vi.fn().mockResolvedValue({ data: [], error: null });
const selectMock = vi.fn().mockReturnValue({ order: orderMock });
const fromMock = vi.fn().mockReturnValue({
  insert: insertMock,
  select: selectMock,
});

vi.mock("@/lib/supabase/client", () => ({
  supabaseConfigured: true,
  supabase: {
    from: fromMock,
  },
}));

describe("smoke: create contact flow", () => {
  it("creates a contact and clears the form", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/contacts"]}>
          <Routes>
            <Route path="/contacts" element={<Contacts />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const nameInput = screen.getByPlaceholderText("Full name");
    fireEvent.change(nameInput, { target: { value: "Sam Vendor" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Contact" }));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });

    expect(fromMock).toHaveBeenCalledWith("contacts");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Sam Vendor",
      })
    );

    await waitFor(() => {
      expect((nameInput as HTMLInputElement).value).toBe("");
    });
  });
});
