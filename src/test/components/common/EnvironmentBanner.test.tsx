import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EnvironmentBanner } from "@/components/common/EnvironmentBanner";

describe("EnvironmentBanner", () => {
  beforeEach(() => {
    document.title = "Sticky Mind Grid";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    document.title = "Sticky Mind Grid";
  });

  it("renders nothing when VITE_APP_ENV is unset", () => {
    vi.stubEnv("VITE_APP_ENV", "");
    const { container } = render(<EnvironmentBanner />);
    expect(container.firstChild).toBeNull();
    expect(document.title).toBe("Sticky Mind Grid");
  });

  it("renders nothing when environment is production", () => {
    const { container } = render(<EnvironmentBanner envOverride="production" />);
    expect(container.firstChild).toBeNull();
    expect(document.title).toBe("Sticky Mind Grid");
  });

  it("renders DEV banner with commit hash and API host and prefixes document.title when env is dev", () => {
    const { unmount } = render(
      <EnvironmentBanner
        envOverride="dev"
        apiBaseOverride="https://sticky-mind-grid-api-dev.onrender.com/api"
        commitHashOverride="abc1234"
      />
    );

    const banner = screen.getByTestId("environment-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("DEV ENVIRONMENT");
    expect(banner).toHaveTextContent("commit abc1234");
    expect(banner).toHaveTextContent("API: sticky-mind-grid-api-dev.onrender.com");
    expect(document.title).toBe("[DEV] Sticky Mind Grid");

    unmount();
    expect(document.title).toBe("Sticky Mind Grid");
  });

  it("reads VITE_APP_ENV from import.meta.env when envOverride is not passed", () => {
    vi.stubEnv("VITE_APP_ENV", "dev");
    vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:5000/api");

    render(<EnvironmentBanner commitHashOverride="deadbeef" />);

    const banner = screen.getByTestId("environment-banner");
    expect(banner).toHaveTextContent("DEV ENVIRONMENT");
    expect(banner).toHaveTextContent("commit deadbeef");
    expect(banner).toHaveTextContent("API: 127.0.0.1:5000");
    expect(document.title).toBe("[DEV] Sticky Mind Grid");
  });
});
