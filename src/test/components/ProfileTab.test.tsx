import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { ProfileTab } from "@/components/settings/tabs/ProfileTab";
import { renderWithProviders } from "../test-utils";
import { User } from "@/types/user";

describe("ProfileTab Component - Verified Badge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const verifiedUser: User = {
    id: "user-verified-1",
    email: "verified@example.com",
    fullName: "Verified Jane",
    avatarUrl: "https://example.com/avatar.jpg",
    emailVerified: true,
  };

  const unverifiedUser: User = {
    id: "user-unverified-2",
    email: "unverified@example.com",
    fullName: "Unverified Bob",
    avatarUrl: null,
    emailVerified: false,
  };

  it("renders verified badge on the avatar and profile header when user is verified", () => {
    renderWithProviders(<ProfileTab />, { user: verifiedUser });

    // 1. Avatar overlay verified badge is present
    const avatarBadge = screen.getByTestId("profile-avatar-verified-badge");
    expect(avatarBadge).toBeInTheDocument();
    expect(avatarBadge.className).toContain("absolute");

    // 2. Profile header verified chip is present
    const profileChip = screen.getByTestId("profile-verified-badge");
    expect(profileChip).toBeInTheDocument();
    expect(profileChip).toHaveTextContent("Verified");

    // 3. Email field displays verified status
    const emailStatus = screen.getByTestId("email-verified-status");
    expect(emailStatus).toBeInTheDocument();
    expect(emailStatus).toHaveTextContent("Verified");

    // 4. Unverified badge is NOT rendered
    expect(screen.queryByTestId("profile-unverified-badge")).not.toBeInTheDocument();
  });

  it("renders unverified indicators and verification link when user is unverified", () => {
    renderWithProviders(<ProfileTab />, { user: unverifiedUser });

    // 1. Avatar overlay verified badge is NOT present
    expect(screen.queryByTestId("profile-avatar-verified-badge")).not.toBeInTheDocument();

    // 2. Profile header displays unverified chip
    const unverifiedChip = screen.getByTestId("profile-unverified-badge");
    expect(unverifiedChip).toBeInTheDocument();
    expect(unverifiedChip).toHaveTextContent("Unverified");

    // 3. Email field displays unverified status
    const emailStatus = screen.getByTestId("email-unverified-status");
    expect(emailStatus).toBeInTheDocument();
    expect(emailStatus).toHaveTextContent("Unverified");

    // 4. Verify Email button is available
    const verifyBtn = screen.getByRole("button", { name: /Verify Email/i });
    expect(verifyBtn).toBeInTheDocument();
  });
});
