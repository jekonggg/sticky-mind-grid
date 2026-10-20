import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { renderWithProviders } from "../test-utils";
import { userApi } from "@/services/userApi";

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
      notifyCardMoves: true,
    }),
    updatePreferences: vi.fn().mockResolvedValue({}),
    exportUserData: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    getHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      database: "connected",
      version: "1.3.0",
      commit: "01f0ba1",
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

  it("switches to Appearance tab and displays theme cards and density controls", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const appearanceTabBtn = screen.getByRole("button", { name: /Appearance/i });
    fireEvent.click(appearanceTabBtn);

    expect(screen.getByText("Appearance & Interface")).toBeInTheDocument();
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.getByText("UI Density")).toBeInTheDocument();
    expect(screen.getByText("Comfortable")).toBeInTheDocument();
    expect(screen.getByText("Compact")).toBeInTheDocument();

    // Select Compact mode
    const compactBtn = screen.getByRole("button", { name: /Compact/i });
    fireEvent.click(compactBtn);

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.documentElement.classList.contains("density-compact")).toBe(true);

    // Select Comfortable mode
    const comfortableBtn = screen.getByRole("button", { name: /Comfortable/i });
    fireEvent.click(comfortableBtn);

    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
    expect(document.documentElement.classList.contains("density-comfortable")).toBe(true);
  }, 15000);

  it("switches to Notifications tab and displays audio controls", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const notifTabBtn = screen.getByRole("button", { name: /Notifications & Sound/i });
    fireEvent.click(notifTabBtn);

    expect(screen.getByText("Notifications & Audio")).toBeInTheDocument();
    expect(screen.getByText("In-App Sound Effects")).toBeInTheDocument();
    expect(screen.getByText("Mentions")).toBeInTheDocument();
    expect(screen.getByText("Task Assignments")).toBeInTheDocument();
  }, 15000);

  it("switches to Workflow tab and shows default board view & delete confirmation", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const workflowTabBtn = screen.getByRole("button", { name: /Task & Workflow/i });
    fireEvent.click(workflowTabBtn);

    expect(screen.getByText("Task & Workflow Defaults")).toBeInTheDocument();
    expect(screen.getByText("Default Board View")).toBeInTheDocument();
    expect(screen.getByText("Preferred Export File Format")).toBeInTheDocument();
    expect(screen.getByTestId("export-format-select")).toBeInTheDocument();
    expect(screen.getByText("Delete Confirmation Prompts")).toBeInTheDocument();
    expect(screen.queryByText("Auto-Progress Calculation")).not.toBeInTheDocument();
  }, 15000);

  it("switches to Privacy tab and tests delete account type-to-confirm dialog flow", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const privacyTabBtn = screen.getByRole("button", { name: /Privacy & Data/i });
    fireEvent.click(privacyTabBtn);

    expect(screen.getByText("Privacy & Data Management")).toBeInTheDocument();
    expect(screen.getByText("Export All User Data")).toBeInTheDocument();
    expect(screen.getByText("Download JSON Export")).toBeInTheDocument();

    // Trigger delete account dialog
    const deleteTriggerBtn = screen.getByTestId("delete-account-trigger-btn");
    fireEvent.click(deleteTriggerBtn);

    // Dialog should be open
    expect(screen.getByText("Permanently Delete Account?")).toBeInTheDocument();
    const confirmBtn = screen.getByTestId("confirm-delete-account-btn");
    expect(confirmBtn).toBeDisabled();

    // Type incorrect text
    const input = screen.getByTestId("confirm-delete-account-input");
    fireEvent.change(input, { target: { value: "del" } });
    expect(confirmBtn).toBeDisabled();

    // Cancel dialog first to test reset
    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    // Re-open dialog
    fireEvent.click(deleteTriggerBtn);
    const reopenedInput = screen.getByTestId("confirm-delete-account-input");
    expect((reopenedInput as HTMLInputElement).value).toBe("");

    // Type exact "DELETE"
    fireEvent.change(reopenedInput, { target: { value: "DELETE" } });
    const reopenedConfirmBtn = screen.getByTestId("confirm-delete-account-btn");
    expect(reopenedConfirmBtn).not.toBeDisabled();

    // Click confirm delete
    fireEvent.click(reopenedConfirmBtn);

    await waitFor(() => {
      expect(userApi.deleteAccount).toHaveBeenCalledTimes(1);
    });
  }, 15000);

  it("switches to About tab and fetches health diagnostics", async () => {
    renderWithProviders(<SettingsModal open={true} onClose={onClose} />);

    const aboutTabBtn = screen.getByRole("button", { name: /System & About/i });
    fireEvent.click(aboutTabBtn);

    expect(screen.getByText("System & Diagnostics")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/v1\.3\.0/)).toBeInTheDocument();
      expect(screen.getAllByText(/01f0ba1/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("System in sync")).toBeInTheDocument();
      expect(screen.getByText("Backend API")).toBeInTheDocument();
      expect(screen.getByText("Database Engine")).toBeInTheDocument();
    });
  }, 15000);
});
