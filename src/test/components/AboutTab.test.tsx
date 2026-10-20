import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AboutTab } from "@/components/settings/tabs/AboutTab";
import { renderWithProviders } from "@/test/test-utils";
import { SYSTEM_OWNER } from "@/config/about";

vi.mock("@/services/userApi", () => ({
  userApi: {
    getHealth: vi.fn().mockResolvedValue({
      status: "healthy",
      database: "connected",
      version: "1.3.0",
      commit: "dev",
      environment: "development",
      timestamp: new Date().toISOString(),
    }),
  },
}));

describe("AboutTab Component", () => {
  it("renders the Creator & Ownership Attribution card with details from about.ts config", async () => {
    renderWithProviders(<AboutTab />, { user: null });

    // Verify creator card container
    expect(screen.getByTestId("system-owner-card")).toBeInTheDocument();

    // Verify owner details from config
    expect(screen.getByText(SYSTEM_OWNER.name)).toBeInTheDocument();
    expect(screen.getByText(SYSTEM_OWNER.role)).toBeInTheDocument();
    expect(screen.getByText(SYSTEM_OWNER.badge)).toBeInTheDocument();
    expect(screen.getByText(SYSTEM_OWNER.bio)).toBeInTheDocument();

    // Verify links
    if (SYSTEM_OWNER.links.github) {
      expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
        "href",
        SYSTEM_OWNER.links.github
      );
    }
    if (SYSTEM_OWNER.links.linkedin) {
      expect(screen.getByRole("link", { name: /linkedin/i })).toHaveAttribute(
        "href",
        SYSTEM_OWNER.links.linkedin
      );
    }
    if (SYSTEM_OWNER.links.website) {
      expect(screen.getByRole("link", { name: /website/i })).toHaveAttribute(
        "href",
        SYSTEM_OWNER.links.website
      );
    }
    if (SYSTEM_OWNER.links.facebook) {
      expect(screen.getByRole("link", { name: /facebook/i })).toHaveAttribute(
        "href",
        SYSTEM_OWNER.links.facebook
      );
    }
    if (SYSTEM_OWNER.links.email) {
      expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute(
        "href",
        `mailto:${SYSTEM_OWNER.links.email}`
      );
    }

    // Verify copyright notice
    expect(screen.getByText(SYSTEM_OWNER.copyright)).toBeInTheDocument();
  });
});
