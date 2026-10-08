import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { DevSettings, SseLogEntry } from "@/types/devMode";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";

export const DEV_SETTINGS_STORAGE_KEY = "sticky_mind_grid_dev_settings";

export const defaultDevSettings: DevSettings = {
  simulateSkeletonLoading: false,
  networkLatencyMs: 0,
  chaosErrorMode: "none",
  simulateEmptyState: false,
  simulatedRole: "none",
  simulateSseDisconnect: false,
  forceReducedMotion: false,
};

// Global synchronous getter for API services & non-React files
export function getDevSettings(): DevSettings {
  if (typeof window === "undefined" || !import.meta.env.DEV) {
    return defaultDevSettings;
  }
  try {
    const raw = localStorage.getItem(DEV_SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...defaultDevSettings, ...JSON.parse(raw) };
    }
  } catch {
    // Fallback on error
  }
  return defaultDevSettings;
}

interface DevModeContextValue {
  devSettings: DevSettings;
  updateDevSetting: <K extends keyof DevSettings>(key: K, val: DevSettings[K]) => void;
  resetDevSettings: () => void;
  isDevModalOpen: boolean;
  setIsDevModalOpen: (open: boolean) => void;
  sseLogs: SseLogEntry[];
  addSseLog: (event: string, payload: any) => void;
  clearSseLogs: () => void;
  activeDevModesCount: number;
}

const DevModeContext = createContext<DevModeContextValue | undefined>(undefined);

export const DevModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateLocalSetting } = useSettings();

  // Initialize dev settings
  const [devSettings, setDevSettings] = useState<DevSettings>(() => {
    const stored = getDevSettings();
    return {
      ...stored,
      simulateSkeletonLoading: settings.simulateSkeletonLoading || stored.simulateSkeletonLoading,
    };
  });

  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [sseLogs, setSseLogs] = useState<SseLogEntry[]>([]);

  const addSseLog = useCallback((event: string, payload: any) => {
    const newEntry: SseLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleTimeString(),
      event,
      payload,
    };
    setSseLogs((prev) => [newEntry, ...prev].slice(0, 20));
  }, []);

  const clearSseLogs = useCallback(() => {
    setSseLogs([]);
  }, []);

  // Keep simulateSkeletonLoading synchronized with SettingsContext
  useEffect(() => {
    if (devSettings.simulateSkeletonLoading !== settings.simulateSkeletonLoading) {
      setDevSettings((prev) => {
        const next = { ...prev, simulateSkeletonLoading: settings.simulateSkeletonLoading };
        try {
          localStorage.setItem(DEV_SETTINGS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore write error
        }
        return next;
      });
    }
  }, [settings.simulateSkeletonLoading, devSettings.simulateSkeletonLoading]);

  // Handle forceReducedMotion CSS class on documentElement
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle(
        "force-reduced-motion",
        devSettings.forceReducedMotion
      );
    }
  }, [devSettings.forceReducedMotion]);

  // Global Keyboard Shortcut: Ctrl + Alt + D (or Cmd + Alt + D) to toggle Dev Suite modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsDevModalOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for window-level SSE event dispatches
  useEffect(() => {
    const handleSseLog = (e: Event) => {
      const customEvent = e as CustomEvent<{ event: string; payload: any }>;
      if (customEvent.detail) {
        addSseLog(customEvent.detail.event, customEvent.detail.payload);
      }
    };

    window.addEventListener("smg-dev-sse-log", handleSseLog);
    return () => window.removeEventListener("smg-dev-sse-log", handleSseLog);
  }, [addSseLog]);

  const updateDevSetting = useCallback(
    <K extends keyof DevSettings>(key: K, val: DevSettings[K]) => {
      setDevSettings((prev) => {
        const next = { ...prev, [key]: val };
        try {
          localStorage.setItem(DEV_SETTINGS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });

      // If updating simulateSkeletonLoading, synchronize with SettingsContext
      if (key === "simulateSkeletonLoading") {
        updateLocalSetting("simulateSkeletonLoading", val as boolean);
      }
    },
    [updateLocalSetting]
  );

  const resetDevSettings = useCallback(() => {
    setDevSettings(defaultDevSettings);
    updateLocalSetting("simulateSkeletonLoading", false);
    try {
      localStorage.removeItem(DEV_SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore
    }
    toast.success("Developer settings reset to default");
  }, [updateLocalSetting]);

  // Calculate active developer features count (excluding default/off states)
  const activeDevModesCount =
    (devSettings.simulateSkeletonLoading ? 1 : 0) +
    (devSettings.networkLatencyMs > 0 ? 1 : 0) +
    (devSettings.chaosErrorMode !== "none" ? 1 : 0) +
    (devSettings.simulateEmptyState ? 1 : 0) +
    (devSettings.simulatedRole !== "none" ? 1 : 0) +
    (devSettings.simulateSseDisconnect ? 1 : 0) +
    (devSettings.forceReducedMotion ? 1 : 0);

  return (
    <DevModeContext.Provider
      value={{
        devSettings,
        updateDevSetting,
        resetDevSettings,
        isDevModalOpen,
        setIsDevModalOpen,
        sseLogs,
        addSseLog,
        clearSseLogs,
        activeDevModesCount,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (!context) {
    // If used outside provider (e.g. in test or standalone), return safe fallback
    return {
      devSettings: getDevSettings(),
      updateDevSetting: () => {},
      resetDevSettings: () => {},
      isDevModalOpen: false,
      setIsDevModalOpen: () => {},
      sseLogs: [],
      addSseLog: () => {},
      clearSseLogs: () => {},
      activeDevModesCount: 0,
    };
  }
  return context;
};
