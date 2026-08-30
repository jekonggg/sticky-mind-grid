import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock as any;

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock as any;

// Polyfill pointer capture methods for Radix UI dropdown menus in jsdom
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
window.HTMLElement.prototype.setPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Global mock for useActivity hook
vi.mock("@/hooks/useActivity", () => ({
  useActivity: () => ({
    activities: [],
    addActivity: vi.fn(),
    clearActivities: vi.fn(),
    setBoardId: vi.fn(),
    refreshActivities: vi.fn().mockResolvedValue(undefined),
  }),
  ActivityProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Default safe global fetch mock to isolate unit tests from dev server
global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
  const urlStr = String(url);

  if (urlStr.includes("/api/users/me/preferences")) {
    return Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  if (urlStr.includes("/comments")) {
    return Promise.resolve(
      new Response(JSON.stringify({ comments: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  if (urlStr.includes("/notes")) {
    return Promise.resolve(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  if (urlStr.includes("/api/activities")) {
    return Promise.resolve(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  return Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
});
