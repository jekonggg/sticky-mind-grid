import React from "react";
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DevSkeletonToolbar } from "@/components/common/DevSkeletonToolbar";
import { useSettings } from "@/contexts/SettingsContext";

function TestConsumer() {
  const { settings, updateLocalSetting } = useSettings();
  return (
    <div>
      <span data-testid="status">
        {settings.simulateSkeletonLoading ? "SIMULATING" : "NORMAL"}
      </span>
      <button
        onClick={() => updateLocalSetting("simulateSkeletonLoading", true)}
      >
        Enable Sim
      </button>
      <DevSkeletonToolbar />
    </div>
  );
}

describe("DevSkeletonToolbar", () => {
  it("renders idle floating Dev Mode button when no modes are active", () => {
    localStorage.clear();
    renderWithProviders(<TestConsumer />);

    expect(screen.getByTestId("status")).toHaveTextContent("NORMAL");
    expect(screen.queryByLabelText("Developer Mode Toolbar")).not.toBeInTheDocument();
    expect(screen.getByTestId("dev-mode-floating-btn")).toBeInTheDocument();
  });

  it("renders floating toolbar and can exit when simulateSkeletonLoading is true", () => {
    localStorage.clear();
    renderWithProviders(<TestConsumer />);

    // Turn simulation on
    fireEvent.click(screen.getByText("Enable Sim"));

    expect(screen.getByTestId("status")).toHaveTextContent("SIMULATING");
    expect(screen.getByLabelText("Developer Mode Toolbar")).toBeInTheDocument();
    expect(screen.getByText(/Dev Mode: Skeleton Simulator Active/i)).toBeInTheDocument();

    // Click Exit button
    fireEvent.click(screen.getByText("Exit"));
    expect(screen.getByTestId("status")).toHaveTextContent("NORMAL");
    expect(screen.queryByLabelText("Developer Mode Toolbar")).not.toBeInTheDocument();
  });

  it("collapses into just a dev button, and expands back when button is clicked", () => {
    localStorage.clear();
    renderWithProviders(<TestConsumer />);

    // Enable sim so container toolbar appears
    fireEvent.click(screen.getByText("Enable Sim"));

    const toolbar = screen.getByLabelText("Developer Mode Toolbar");
    expect(toolbar).toBeInTheDocument();
    expect(toolbar).toHaveAttribute("data-collapsed", "false");

    // Click collapse button
    const collapseBtn = screen.getByTestId("dev-toolbar-collapse-btn");
    fireEvent.click(collapseBtn);

    // Now full container is gone, and only the floating Dev Mode button is visible
    expect(screen.queryByLabelText("Developer Mode Toolbar")).not.toBeInTheDocument();
    const devBtn = screen.getByTestId("dev-mode-floating-btn");
    expect(devBtn).toBeInTheDocument();
    expect(devBtn).toHaveTextContent(/Dev Mode/i);
    expect(localStorage.getItem("smg_dev_toolbar_collapsed")).toBe("true");

    // Click the dev button to expand container back
    fireEvent.click(devBtn);
    expect(screen.getByLabelText("Developer Mode Toolbar")).toBeInTheDocument();
    expect(localStorage.getItem("smg_dev_toolbar_collapsed")).toBe("false");
  });
});
