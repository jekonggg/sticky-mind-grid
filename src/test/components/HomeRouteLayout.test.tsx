import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/contexts/AuthContext";
import { HomeRouteLayout } from "@/components/landing/HomeRouteLayout";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: () => <section aria-label="Application workspace"><Outlet /></section>,
}));
vi.mock("@/components/skeletons", () => ({
  AppLayoutSkeleton: () => <div role="status" aria-label="Loading application" />,
}));
vi.mock("@/pages/LandingPage", () => ({
  default: () => <h1>Welcome to Sticky Mind Grid</h1>,
}));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<HomeRouteLayout />}>
          <Route path="/" element={<h1>Your boards</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function guestAuth() {
  return {
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
  };
}

describe("Home route layout", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(guestAuth());
  });

  it("welcomes guests without mounting the private boards workspace", async () => {
    renderHome();
    expect(await screen.findByRole("heading", { name: "Welcome to Sticky Mind Grid" })).toBeVisible();
    expect(screen.queryByRole("region", { name: "Application workspace" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your boards" })).not.toBeInTheDocument();
  });

  it("keeps signed-in users in their boards workspace at the home route", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...guestAuth(),
      user: { id: "user-123", email: "jamie@example.com", fullName: "Jamie" },
      token: "saved-token",
    });
    renderHome();
    expect(screen.getByRole("region", { name: "Application workspace" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Your boards" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Welcome to Sticky Mind Grid" })).not.toBeInTheDocument();
  });

  it("waits for authentication resolution before displaying public or private content", () => {
    vi.mocked(useAuth).mockReturnValue({ ...guestAuth(), loading: true });
    renderHome();
    expect(screen.getByRole("status", { name: "Loading application" })).toBeVisible();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Application workspace" })).not.toBeInTheDocument();
  });
});
