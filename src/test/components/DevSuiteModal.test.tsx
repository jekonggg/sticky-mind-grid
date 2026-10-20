import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { DevSkeletonToolbar } from "@/components/common/DevSkeletonToolbar";
import { authenticatedFetch } from "@/services/apiUtils";
import { resetSeedSandboxStore } from "@/data/devSeedDataset";
import { DEV_SETTINGS_STORAGE_KEY } from "@/contexts/DevModeContext";

describe("DevSuiteModal & Predefined Seed Takeover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetSeedSandboxStore("none");
  });

  it("opens DevSuiteModal with non-overlapping inline-flex tab triggers and switches to Helpers & Stress", async () => {
    renderWithProviders(<DevSkeletonToolbar />, { user: mockUser });

    const openBtn = screen.getByRole("button", { name: /open developer suite/i });
    fireEvent.click(openBtn);

    const skeletonsTab = await screen.findByRole("tab", { name: /skeletons & latency/i });
    const geometryTab = screen.getByRole("tab", { name: /geometry & radii/i });
    const helpersTab = screen.getByRole("tab", { name: /helpers & stress/i });

    expect(skeletonsTab).toHaveClass("flex-none", "shrink-0", "whitespace-nowrap");
    expect(geometryTab).toHaveClass("flex-none", "shrink-0", "whitespace-nowrap");

    const tabList = skeletonsTab.closest("[role='tablist']");
    expect(tabList).toHaveClass("inline-flex");
    expect(tabList).not.toHaveClass("sm:grid-cols-6");

    // Switch to Helpers & Stress tab using keyboard/mouse
    fireEvent.mouseDown(helpersTab, { button: 0 });
    fireEvent.click(helpersTab);

    expect(await screen.findByTestId("seed-takeover-card")).toBeInTheDocument();
    expect(screen.getByTestId("seed-preset-full_showcase")).toBeInTheDocument();
    expect(screen.getByTestId("seed-preset-scale_stress")).toBeInTheDocument();
    expect(screen.getByTestId("seed-preset-onboarding_invites")).toBeInTheDocument();
  });

  it("intercepts authenticatedFetch with predefined seed data when Full System Showcase is active and supports in-memory mutations & reset", async () => {
    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ seedTakeoverPreset: "full_showcase" })
    );

    // 1. Fetch boards from in-memory showcase seed
    const boardsRes = await authenticatedFetch("/boards");
    expect(boardsRes.ok).toBe(true);
    const boards = await boardsRes.json();
    expect(boards).toHaveLength(6);
    expect(boards[0].name).toBe("Platform Engine — Q4 Roadmap");

    // 2. Fetch pending invitations
    const invitesRes = await authenticatedFetch("/boards/invitations");
    const invites = await invitesRes.json();
    expect(invites).toHaveLength(2);
    expect(invites[0].board.description).toBeUndefined();

    // 3. Mutate in-memory store by accepting an invitation
    const acceptRes = await authenticatedFetch(
      `/boards/${invites[0].boardId}/invitations/accept`,
      { method: "POST" }
    );
    expect(acceptRes.ok).toBe(true);

    const boardsAfterAccept = await (await authenticatedFetch("/boards")).json();
    expect(boardsAfterAccept).toHaveLength(7);

    // 4. Resetting the seed snapshot restores the original 6 boards and 2 invitations
    resetSeedSandboxStore("full_showcase");
    const boardsAfterReset = await (await authenticatedFetch("/boards")).json();
    expect(boardsAfterReset).toHaveLength(6);
  });

  it("provides 24 boards in scale_stress preset and 0 boards + 3 invites in onboarding_invites preset", async () => {
    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ seedTakeoverPreset: "scale_stress" })
    );
    const scaleBoards = await (await authenticatedFetch("/boards")).json();
    expect(scaleBoards).toHaveLength(24);

    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ seedTakeoverPreset: "onboarding_invites" })
    );
    const onboardingBoards = await (await authenticatedFetch("/boards")).json();
    const onboardingInvites = await (await authenticatedFetch("/boards/invitations")).json();
    expect(onboardingBoards).toHaveLength(0);
    expect(onboardingInvites).toHaveLength(3);
  });

  it("displays the Seed Takeover badge on DevSkeletonToolbar when a preset is enabled", async () => {
    localStorage.setItem(
      DEV_SETTINGS_STORAGE_KEY,
      JSON.stringify({ seedTakeoverPreset: "full_showcase" })
    );

    renderWithProviders(<DevSkeletonToolbar />, { user: mockUser });

    await waitFor(() => {
      expect(screen.getByTestId("toolbar-seed-badge")).toHaveTextContent(/Seed:\s*Showcase/i);
    });
  });

  it("allows switching kanban column color styles in DevSuiteModal", async () => {
    renderWithProviders(<DevSkeletonToolbar />, { user: mockUser });

    fireEvent.click(screen.getByRole("button", { name: /open developer suite/i }));

    const geometryTab = await screen.findByRole("tab", { name: /geometry & radii/i });
    fireEvent.mouseDown(geometryTab, { button: 0 });
    fireEvent.click(geometryTab);

    expect(await screen.findByText("Kanban Column Surface & Pod Theme")).toBeInTheDocument();
    expect(screen.getByText("Frosted Glass (Translucent)")).toBeInTheDocument();
    expect(screen.getByText("Warm Charcoal & Stone")).toBeInTheDocument();
    expect(screen.getByText("Workflow Stage Ambient Tint")).toBeInTheDocument();
    expect(screen.getByText("Classic Slate Blue (Legacy)")).toBeInTheDocument();

    const glassButton = screen.getByRole("button", { name: /frosted glass \(translucent\)/i });
    fireEvent.click(glassButton);

    const stored = JSON.parse(localStorage.getItem(DEV_SETTINGS_STORAGE_KEY) || "{}");
    expect(stored.columnColorStyle).toBe("glass");
  });
});
