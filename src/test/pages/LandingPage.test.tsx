import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import LandingPage from "@/pages/LandingPage";

function renderLanding() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<h1>Create an account</h1>} />
        <Route path="/login" element={<h1>Sign in to your workspace</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Landing page", () => {
  it("lets keyboard users explore the sample board, list, and calendar", async () => {
    renderLanding();
    const board = screen.getByRole("tab", { name: "Board" });
    const list = screen.getByRole("tab", { name: "List" });
    const calendar = screen.getByRole("tab", { name: "Calendar" });

    expect(board).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel")).getByText("Collect the big ideas")).toBeVisible();

    act(() => board.focus());
    fireEvent.keyDown(board, { key: "ArrowRight" });
    await waitFor(() => expect(list).toHaveFocus());
    expect(list).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel")).getByText("Task name")).toBeVisible();

    fireEvent.keyDown(list, { key: "ArrowRight" });
    await waitFor(() => expect(calendar).toHaveFocus());
    expect(calendar).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel")).getByText(/Sample schedule/)).toBeVisible();

    fireEvent.keyDown(calendar, { key: "Home" });
    await waitFor(() => expect(board).toHaveFocus());
    expect(board).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("tabpanel")).getByText("Collect the big ideas")).toBeVisible();
  });

  it("reveals FAQ answers and closes the previous answer when opening another", () => {
    renderLanding();
    const personal = screen.getByRole("button", { name: "Can I use it for my own projects?" });
    const collaboration = screen.getByRole("button", { name: "How does team collaboration work?" });

    expect(personal).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(personal);
    expect(personal).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Start with a personal board/)).toBeVisible();

    fireEvent.click(collaboration);
    expect(personal).toHaveAttribute("aria-expanded", "false");
    expect(collaboration).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Invite people to a board by email/)).toBeVisible();

    fireEvent.click(collaboration);
    expect(collaboration).toHaveAttribute("aria-expanded", "false");
  });

  it("opens account creation from the main call to action", () => {
    renderLanding();
    fireEvent.click(screen.getByRole("link", { name: "Find your flow" }));
    expect(screen.getByRole("heading", { name: "Create an account" })).toBeVisible();
  });

  it("takes returning users to sign in", () => {
    renderLanding();
    const footer = screen.getByRole("navigation", { name: "Footer navigation" });
    fireEvent.click(within(footer).getByRole("link", { name: "Sign in" }));
    expect(screen.getByRole("heading", { name: "Sign in to your workspace" })).toBeVisible();
  });

  it("announces the mobile menu state and returns focus to its trigger on Escape", () => {
    renderLanding();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    const menu = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    act(() => within(menu).getByRole("link", { name: "Features" }).focus());
    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
  });

  it("closes mobile navigation after choosing a page section", () => {
    renderLanding();
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    fireEvent.click(trigger);
    const menu = screen.getByRole("navigation", { name: "Mobile navigation" });
    const features = within(menu).getByRole("link", { name: "Features" });
    expect(features).toHaveAttribute("href", "#features");
    fireEvent.click(features);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile navigation" })).not.toBeInTheDocument();
  });
});
