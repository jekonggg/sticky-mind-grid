import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { renderWithProviders } from "../test-utils";

// Mock userApi
vi.mock("@/services/userApi", () => ({
  userApi: {
    getPreferences: vi.fn().mockResolvedValue({
      defaultBoardView: "board",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      firstDayOfWeek: 0,
      notifyMentions: true,
      notifyAssignments: true,
      notifyInvites: true,
      notifyComments: true,
    }),
    updatePreferences: vi.fn().mockResolvedValue({}),
    exportUserData: vi.fn().mockResolvedValue(undefined),
    getHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      database: "connected",
      version: "1.2.0",
      environment: "test",
      timestamp: new Date().toISOString(),
    }),
  },
}));

describe("SettingsModal Component", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders modal with sidebar tabs when open", () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getAllByText("Account Profile").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: /Appearance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Notifications & Sound/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Task & Workflow/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Language & Region/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy & Data/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /System & About/i })).toBeInTheDocument();
  }, 15000);

  it("switches to Appearance tab and displays theme cards", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const appearanceTabBtn = screen.getByRole("button", { name: /Appearance/i });
    fireEvent.click(appearanceTabBtn);

    expect(screen.getByText("Appearance & Interface")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("UI Density")).toBeInTheDocument();
  });

  it("switches to Notifications tab and displays audio controls", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const notifTabBtn = screen.getByRole("button", { name: /Notifications & Sound/i });
    fireEvent.click(notifTabBtn);

    expect(screen.getByText("Notifications & Audio")).toBeInTheDocument();
    expect(screen.getByText("In-App Sound Effects")).toBeInTheDocument();
    expect(screen.getByText("Mentions")).toBeInTheDocument();
    expect(screen.getByText("Task Assignments")).toBeInTheDocument();
  });

  it("switches to Workflow tab and shows default board view & auto-progress", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const workflowTabBtn = screen.getByRole("button", { name: /Task & Workflow/i });
    fireEvent.click(workflowTabBtn);

    expect(screen.getByText("Task & Workflow Defaults")).toBeInTheDocument();
    expect(screen.getByText("Default Board View")).toBeInTheDocument();
    expect(screen.getByText("Auto-Progress Calculation")).toBeInTheDocument();
  });

  it("switches to Privacy tab and displays data export button", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const privacyTabBtn = screen.getByRole("button", { name: /Privacy & Data/i });
    fireEvent.click(privacyTabBtn);

    expect(screen.getByText("Privacy & Data Management")).toBeInTheDocument();
    expect(screen.getByText("Export All User Data")).toBeInTheDocument();
    expect(screen.getByText("Download JSON Export")).toBeInTheDocument();
  });

  it("switches to About tab and fetches health diagnostics", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const aboutTabBtn = screen.getByRole("button", { name: /System & About/i });
    fireEvent.click(aboutTabBtn);

    expect(screen.getByText("System & Diagnostics")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Backend API")).toBeInTheDocument();
      expect(screen.getByText("Database Engine")).toBeInTheDocument();
    });
  });
});
