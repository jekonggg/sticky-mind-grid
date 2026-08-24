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
