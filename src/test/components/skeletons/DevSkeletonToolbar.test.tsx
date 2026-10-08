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
  it("does not render when simulateSkeletonLoading is false", () => {
    renderWithProviders(<TestConsumer />);

    expect(screen.getByTestId("status")).toHaveTextContent("NORMAL");
    expect(screen.queryByLabelText("Developer Mode Toolbar")).not.toBeInTheDocument();
  });

  it("renders floating toolbar and can exit when simulateSkeletonLoading is true", () => {
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
});
