import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";

describe("VerifiedBadge Component", () => {
  it("renders null when isVerified is false", () => {
    const { container } = render(<VerifiedBadge isVerified={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders default icon badge when isVerified is true", () => {
    render(<VerifiedBadge isVerified={true} dataTestId="test-verified-badge" />);
    const badge = screen.getByTestId("test-verified-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("aria-label", "Verified Account");
  });

  it("renders chip variant with 'Verified' label", () => {
    render(<VerifiedBadge variant="chip" size="sm" dataTestId="test-chip-badge" />);
    const chip = screen.getByTestId("test-chip-badge");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent("Verified");
  });

  it("renders avatar-badge variant with absolute positioning classes", () => {
    render(<VerifiedBadge variant="avatar-badge" size="md" dataTestId="test-avatar-badge" />);
    const avatarBadge = screen.getByTestId("test-avatar-badge");
    expect(avatarBadge).toBeInTheDocument();
    expect(avatarBadge.className).toContain("absolute");
    expect(avatarBadge.className).toContain("rounded-full");
  });

  it("supports custom tooltipText and dataTestId", () => {
    render(
      <VerifiedBadge
        tooltipText="Custom Verified Label"
        dataTestId="custom-badge"
      />
    );
    const badge = screen.getByTestId("custom-badge");
    expect(badge).toHaveAttribute("aria-label", "Custom Verified Label");
  });
});
