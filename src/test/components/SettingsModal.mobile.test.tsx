import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { renderWithProviders } from "../test-utils";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

vi.mock("@/services/userApi", () => ({
  userApi: {
    getPreferences: vi.fn().mockResolvedValue({}),
    updatePreferences: vi.fn().mockResolvedValue({}),
    exportUserData: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    getHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      database: "connected",
      version: "1.3.0",
      environment: "test",
      timestamp: new Date().toISOString(),
    }),
  },
}));

const SECTIONS = [
  "Account Profile",
  "Appearance",
  "Notifications & Sound",
  "Task & Workflow",
  "Language & Region",
  "Privacy & Data",
  "System & About",
];

describe("SettingsModal mobile flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the section index instead of the desktop sidebar", () => {
    renderWithProviders(<SettingsModal open={true} onClose={vi.fn()} />);

    expect(
      screen.getByRole("heading", { name: "Settings" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Settings sections" })
    ).toBeInTheDocument();

    SECTIONS.forEach((section) => {
      expect(
        screen.getByRole("button", { name: new RegExp(section) })
      ).toBeInTheDocument();
    });

    // The desktop sidebar footer is not part of the mobile index.
    expect(screen.queryByText(/to close/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Appearance & Interface")).not.toBeInTheDocument();
  }, 15000);

  it("opens a section detail and returns to the index", () => {
    renderWithProviders(<SettingsModal open={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Appearance/ }));

    expect(screen.getByText("Appearance & Interface")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Settings sections" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Back to Settings" })
    );

    expect(
      screen.getByRole("heading", { name: "Settings" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Appearance & Interface")).not.toBeInTheDocument();
  }, 15000);

  it("can open directly on a section detail for sidebar shortcuts", () => {
    renderWithProviders(
      <SettingsModal
        open={true}
        onClose={vi.fn()}
        initialTab="appearance"
        initialView="detail"
      />
    );

    expect(screen.getByText("Appearance & Interface")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Back to Settings" })
    ).toBeInTheDocument();
  });
});
