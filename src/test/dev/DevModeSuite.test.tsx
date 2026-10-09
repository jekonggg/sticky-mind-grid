import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, fireEvent, renderHook, act } from "@testing-library/react";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { useDevMode, DEV_SETTINGS_STORAGE_KEY } from "@/contexts/DevModeContext";
import { DevSkeletonToolbar } from "@/components/common/DevSkeletonToolbar";
import { authenticatedFetch } from "@/services/apiUtils";
import { useBoardPermissions } from "@/hooks/useBoardPermissions";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import { Board } from "@/types/board";
import { AuthContext, AuthContextType } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { DevModeProvider } from "@/contexts/DevModeContext";

const mockAuthValue: AuthContextType = {
  user: mockUser,
  token: "mock-token",
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  updateUser: vi.fn(),
};

function DevWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={mockAuthValue}>
      <SettingsProvider>
        <DevModeProvider>{children}</DevModeProvider>
      </SettingsProvider>
    </AuthContext.Provider>
  );
}

const mockBoard: Board = {
  id: "board-dev-1",
  name: "Dev Mode Testing Board",
  ownerId: "owner-999", // Different from mockUser.id
  emoji: "🛠️",
  color: "hsl(220, 80%, 56%)",
  columns: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Developer Mode Suite", () => {
  beforeEach(() => {
    localStorage.removeItem(DEV_SETTINGS_STORAGE_KEY);
    document.documentElement.classList.remove("force-reduced-motion");
    vi.restoreAllMocks();
  });

  describe("DevModeContext & Toolbar Integration", () => {
    function DevTestConsumer() {
      const { devSettings, updateDevSetting, setIsDevModalOpen } = useDevMode();
      return (
        <div>
          <button
            onClick={() => updateDevSetting("networkLatencyMs", 1500)}
          >
            Set Latency
          </button>
          <button
            onClick={() => updateDevSetting("chaosErrorMode", "500")}
          >
            Set Chaos 500
          </button>
          <button
            onClick={() => updateDevSetting("simulatedRole", "viewer")}
          >
            Set Role Viewer
          </button>
          <button
            onClick={() => updateDevSetting("forceReducedMotion", true)}
          >
            Set Reduced Motion
          </button>
          <button
            onClick={() => updateDevSetting("fontFamily", "fraunces")}
          >
            Set Font Fraunces
          </button>
          <button
            onClick={() => updateDevSetting("fontFamily", "inter")}
          >
            Set Font Inter
          </button>
          <button
            onClick={() => updateDevSetting("disableEmojiCustomization", true)}
          >
            Set No Emojis
          </button>
          <button onClick={() => setIsDevModalOpen(true)}>Open Modal</button>
          <DevSkeletonToolbar />
        </div>
      );
    }

    it("renders active badges for latency, chaos, role spoofing, font family, and no emojis", () => {
      renderWithProviders(<DevTestConsumer />);

      // Initially no toolbar
      expect(screen.queryByLabelText("Developer Mode Toolbar")).not.toBeInTheDocument();

      // Trigger latency
      fireEvent.click(screen.getByText("Set Latency"));
      expect(screen.getByLabelText("Developer Mode Toolbar")).toBeInTheDocument();
      expect(screen.getByText(/⚡ 1500ms/i)).toBeInTheDocument();

      // Trigger chaos 500
      fireEvent.click(screen.getByText("Set Chaos 500"));
      expect(screen.getByText(/💥 500/i)).toBeInTheDocument();

      // Trigger role spoof
      fireEvent.click(screen.getByText("Set Role Viewer"));
      expect(screen.getByText(/🎭 viewer/i)).toBeInTheDocument();

      // Trigger font family Fraunces
      fireEvent.click(screen.getByText("Set Font Fraunces"));
      expect(screen.getByText(/🔤 Fraunces/i)).toBeInTheDocument();

      // Trigger No Emojis
      fireEvent.click(screen.getByText("Set No Emojis"));
      expect(screen.getByText(/🚫 No Emojis/i)).toBeInTheDocument();
    });

    it("updates documentElement --app-font and body fontFamily when font is toggled", () => {
      renderWithProviders(<DevTestConsumer />);

      fireEvent.click(screen.getByText("Set Font Inter"));
      expect(document.documentElement.style.getPropertyValue("--app-font")).toContain("Inter");
      expect(document.body.style.fontFamily).toContain("Inter");

      fireEvent.click(screen.getByText("Set Font Fraunces"));
      expect(document.documentElement.style.getPropertyValue("--app-font")).toContain("Fraunces");
      expect(document.body.style.fontFamily).toContain("Fraunces");
    });

    it("opens the Developer Mode Suite modal and displays the typography tab", () => {
      renderWithProviders(<DevTestConsumer />);

      fireEvent.click(screen.getByText("Open Modal"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Developer Mode Suite")).toBeInTheDocument();
      expect(screen.getByText("Freeze Skeleton Loading")).toBeInTheDocument();
      expect(screen.getByText("Typography")).toBeInTheDocument();
    });

    it("toggles force-reduced-motion class on documentElement", () => {
      renderWithProviders(<DevTestConsumer />);

      expect(document.documentElement.classList.contains("force-reduced-motion")).toBe(false);

      fireEvent.click(screen.getByText("Set Reduced Motion"));
      expect(document.documentElement.classList.contains("force-reduced-motion")).toBe(true);
    });
  });

  describe("Network Interceptor (authenticatedFetch)", () => {
    it("intercepts with 500 status when chaosErrorMode is 500", async () => {
      localStorage.setItem(
        DEV_SETTINGS_STORAGE_KEY,
        JSON.stringify({ chaosErrorMode: "500", networkLatencyMs: 0 })
      );

      const res = await authenticatedFetch("/boards");
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.message).toContain("DevMode Simulated Server Error");
    });

    it("intercepts with 403 status when chaosErrorMode is 403", async () => {
      localStorage.setItem(
        DEV_SETTINGS_STORAGE_KEY,
        JSON.stringify({ chaosErrorMode: "403", networkLatencyMs: 0 })
      );

      const res = await authenticatedFetch("/boards");
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.message).toContain("DevMode Simulated Forbidden");
    });

    it("throws network error when chaosErrorMode is network_error", async () => {
      localStorage.setItem(
        DEV_SETTINGS_STORAGE_KEY,
        JSON.stringify({ chaosErrorMode: "network_error", networkLatencyMs: 0 })
      );

      await expect(authenticatedFetch("/boards")).rejects.toThrow("DevMode Simulated Offline");
    });

    it("returns empty array [] when simulateEmptyState is true", async () => {
      localStorage.setItem(
        DEV_SETTINGS_STORAGE_KEY,
        JSON.stringify({ simulateEmptyState: true, chaosErrorMode: "none", networkLatencyMs: 0 })
      );

      const res = await authenticatedFetch("/boards");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });
  });

  describe("Role & Permission Spoofing (useBoardPermissions)", () => {
    it("spoofs user permissions to viewer even if real role was owner", () => {
      const { result } = renderHook(() => useBoardPermissions(mockBoard, []), {
        wrapper: DevWrapper,
      });

      // Initially user is viewer (since ownerId != mockUser.id and no member row)
      expect(result.current.role).toBe("viewer");
      expect(result.current.canEditBoard).toBe(false);
      expect(result.current.canCreateTask).toBe(false);
    });

    it("spoofs permissions to admin when simulatedRole is admin", () => {
      localStorage.setItem(
        DEV_SETTINGS_STORAGE_KEY,
        JSON.stringify({ simulatedRole: "admin" })
      );

      // Re-render with simulatedRole = admin
      const { result } = renderHook(() => useBoardPermissions(mockBoard, []), {
        wrapper: DevWrapper,
      });

      expect(result.current.role).toBe("admin");
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.canEditBoard).toBe(true);
      expect(result.current.canManageMembers).toBe(true);
      expect(result.current.canCreateTask).toBe(true);
      expect(result.current.canDeleteBoard).toBe(false); // only owner can delete
      expect(result.current.isSimulated).toBe(true);
    });

    it("spoofs permissions to owner when simulatedRole is owner", () => {
      localStorage.setItem(
        DEV_SETTINGS_STORAGE_KEY,
        JSON.stringify({ simulatedRole: "owner" })
      );

      const { result } = renderHook(() => useBoardPermissions(mockBoard, []), {
        wrapper: DevWrapper,
      });

      expect(result.current.role).toBe("owner");
      expect(result.current.isOwner).toBe(true);
      expect(result.current.canDeleteBoard).toBe(true);
      expect(result.current.canManageMembers).toBe(true);
      expect(result.current.canCreateTask).toBe(true);
      expect(result.current.isSimulated).toBe(true);
    });
  });

  describe("Real-Time SSE Disconnect & Logging (useBoardRealtime)", () => {
    it("does not connect when simulateSseDisconnect is true", () => {
      localStorage.setItem(
        DEV_SETTINGS_STORAGE_KEY,
        JSON.stringify({ simulateSseDisconnect: true })
      );

      const { result } = renderHook(
        () => useBoardRealtime({ boardId: "board-dev-1" }),
        { wrapper: DevWrapper }
      );

      expect(result.current.isConnected).toBe(false);
    });
  });
});
