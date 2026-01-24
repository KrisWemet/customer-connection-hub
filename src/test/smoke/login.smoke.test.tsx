import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { supabase } from "@/lib/supabase/client";

function LoginScreen() {
  const navigate = useNavigate();
  return (
    <div>
      <h1>Login</h1>
      <button
        onClick={async () => {
          await supabase.auth.signInWithPassword({
            email: "shannon@rusticretreat.co",
            password: "test",
          });
          navigate("/");
        }}
      >
        Sign in
      </button>
    </div>
  );
}

function Dashboard() {
  return <h1>Dashboard</h1>;
}

vi.mock("@/lib/supabase/client", async () => {
  const { vi } = await import("vitest");
  return {
    supabase: {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ data: { session: {} }, error: null }),
      },
    },
  };
});

describe("smoke: login flow", () => {
  it("signs in and navigates to dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "shannon@rusticretreat.co",
      password: "test",
    });
  });
});
