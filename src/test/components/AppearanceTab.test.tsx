import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { AppearanceTab } from "@/components/settings/tabs/AppearanceTab";
import { renderWithProviders } from "../test-utils";

describe("AppearanceTab Component - Multi-Theme & System Colorways", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("style");
    localStorage.clear();
  });

  it("renders base theme preferences and system colorways", () => {
    renderWithProviders(<AppearanceTab />);

    expect(screen.getByText("Appearance & Interface")).toBeInTheDocument();
    expect(screen.getByText("Theme Preference")).toBeInTheDocument();
    expect(screen.getByText("System Theme & Colorways")).toBeInTheDocument();

    // Verify all 7 system colorway options are rendered
    expect(screen.getByText("Linear Indigo & Slate")).toBeInTheDocument();
    expect(screen.getByText("Pitch Black & Pastel")).toBeInTheDocument();
    expect(screen.getByText("Obsidian & Neon Lime")).toBeInTheDocument();
    expect(screen.getByText("Forest & Emerald Mint")).toBeInTheDocument();
    expect(screen.getByText("Sunset Amber & Coral")).toBeInTheDocument();
    expect(screen.getByText("Rose & Crimson Noir")).toBeInTheDocument();
    expect(screen.getByText("Abyss Ocean & Cyan")).toBeInTheDocument();

    // Verify live preview is present
    expect(screen.getByText("Live Theme Preview")).toBeInTheDocument();
  }, 15000);

  it("switches colorway and applies correct CSS class to documentElement", () => {
    renderWithProviders(<AppearanceTab />);

    // Click Emerald Mint
    const emeraldBtn = screen.getByRole("button", { name: /Forest & Emerald Mint/i });
    fireEvent.click(emeraldBtn);

    expect(document.documentElement.classList.contains("colorway-emerald")).toBe(true);

    // Click Sunset Amber & Coral
    const sunsetBtn = screen.getByRole("button", { name: /Sunset Amber & Coral/i });
    fireEvent.click(sunsetBtn);

    expect(document.documentElement.classList.contains("colorway-sunset")).toBe(true);
    expect(document.documentElement.classList.contains("colorway-emerald")).toBe(false);

    // Click Obsidian & Neon Lime
    const neonBtn = screen.getByRole("button", { name: /Obsidian & Neon Lime/i });
    fireEvent.click(neonBtn);

    expect(document.documentElement.classList.contains("colorway-neon")).toBe(true);
    expect(document.documentElement.classList.contains("colorway-sunset")).toBe(false);
  }, 15000);

  it("supports advanced custom primary accent color", () => {
    renderWithProviders(<AppearanceTab />);

    // Open custom accent controls
    const toggleBtn = screen.getByText(/Advanced: Custom Primary Accent Color/i);
    fireEvent.click(toggleBtn);

    expect(screen.getByText("Custom Primary Color")).toBeInTheDocument();

    const colorTextInput = screen.getByPlaceholderText("#4F46E5");
    fireEvent.change(colorTextInput, { target: { value: "#10B981" } });

    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#10B981");

    // Click Reset to Theme Default
    const resetCustomBtn = screen.getByText("Reset to Theme Default");
    fireEvent.click(resetCustomBtn);

    expect(document.documentElement.style.getPropertyValue("--primary")).toBe("");
  }, 15000);

  it("resets all local display settings to default values", () => {
    renderWithProviders(<AppearanceTab />);

    // Select Compact UI density and Ocean colorway
    const compactBtn = screen.getByRole("button", { name: /Compact/i });
    fireEvent.click(compactBtn);

    const oceanBtn = screen.getByRole("button", { name: /Abyss Ocean & Cyan/i });
    fireEvent.click(oceanBtn);

    expect(document.documentElement.getAttribute("data-density")).toBe("compact");
    expect(document.documentElement.classList.contains("colorway-ocean")).toBe(true);

    // Click Reset Defaults
    const resetDefaultsBtn = screen.getByRole("button", { name: /Reset Defaults/i });
    fireEvent.click(resetDefaultsBtn);

    expect(document.documentElement.getAttribute("data-density")).toBe("comfortable");
    expect(document.documentElement.classList.contains("colorway-mast")).toBe(true);
  }, 15000);
});
