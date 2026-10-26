import { isDevSuiteEnabled } from "@/utils/envUtils";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { QueryClientContext } from "@tanstack/react-query";
import { DevSettings, SseLogEntry } from "@/types/devMode";
import { FONT_STACK_MAP } from "@/constants/fonts";
import { useSettings } from "@/contexts/SettingsContext";
import { resetSeedSandboxStore } from "@/data/devSeedDataset";
import { toast } from "sonner";

export const DEV_SETTINGS_STORAGE_KEY = "sticky_mind_grid_dev_settings";

export const defaultDevSettings: DevSettings = {
  simulateSkeletonLoading: false,
  networkLatencyMs: 0,
  chaosErrorMode: "none",
  simulateEmptyState: false,
  seedTakeoverPreset: "none",
  simulatedRole: "none",
  simulateSseDisconnect: false,
  forceReducedMotion: false,
  fontFamily: "helvetica",
  disableEmojiCustomization: false,
  customPadding: null,
  customInnerRadius: null,
  customOuterRadius: null,
  columnColorStyle: "theme",
  taskModalHideLabelIcons: false,
  taskModalLabelCase: "uppercase",
};

export const prodSettings: DevSettings = {
  simulateSkeletonLoading: false,
  networkLatencyMs: 0,
  chaosErrorMode: "none",
  simulateEmptyState: false,
  seedTakeoverPreset: "none",
  simulatedRole: "none",
  simulateSseDisconnect: false,
  forceReducedMotion: false,
  fontFamily: "sora",
  disableEmojiCustomization: true,
  customPadding: 12,
  customInnerRadius: 8,
  customOuterRadius: 12,
  columnColorStyle: "theme",
  taskModalHideLabelIcons: false,
  taskModalLabelCase: "uppercase",
};

// Global synchronous getter for API services & non-React files
export function getDevSettings(): DevSettings {
  if (typeof window === "undefined" || !isDevSuiteEnabled()) {
    return prodSettings;
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
  resetSeedSandbox: () => void;
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
  const queryClient = useContext(QueryClientContext) ?? null;

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

  const notifyDataModeChanged = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("smg-dev-data-mode-changed"));
    }
    if (queryClient) {
      queryClient.invalidateQueries();
    }
  }, [queryClient]);

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

  // Handle dynamic font family application to root & body
  useEffect(() => {
    if (typeof document !== "undefined") {
      const activeFont = devSettings.fontFamily || (!isDevSuiteEnabled() ? "sora" : "helvetica");
      const fontStack = FONT_STACK_MAP[activeFont] || FONT_STACK_MAP.sora;
      document.documentElement.style.setProperty("--app-font", fontStack);
      document.body.style.fontFamily = fontStack;
    }
  }, [devSettings.fontFamily]);

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
        const next: DevSettings = { ...prev, [key]: val };

        // Mutual exclusion between Predefined Seed Takeover and Simulate Empty State
        if (key === "seedTakeoverPreset" && val !== "none") {
          next.simulateEmptyState = false;
          resetSeedSandboxStore(val as DevSettings["seedTakeoverPreset"]);
        } else if (key === "seedTakeoverPreset" && val === "none") {
          resetSeedSandboxStore("none");
        } else if (key === "simulateEmptyState" && val === true) {
          next.seedTakeoverPreset = "none";
          resetSeedSandboxStore("none");
        }

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

      if (key === "seedTakeoverPreset" || key === "simulateEmptyState") {
        setTimeout(() => notifyDataModeChanged(), 0);
      }
    },
    [updateLocalSetting, notifyDataModeChanged]
  );

  const resetSeedSandbox = useCallback(() => {
    resetSeedSandboxStore(devSettings.seedTakeoverPreset);
    notifyDataModeChanged();
    toast.success("Seed sandbox snapshot restored to initial state");
  }, [devSettings.seedTakeoverPreset, notifyDataModeChanged]);

  const resetDevSettings = useCallback(() => {
    resetSeedSandboxStore("none");
    try {
      localStorage.removeItem(DEV_SETTINGS_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setDevSettings(defaultDevSettings);
    updateLocalSetting("simulateSkeletonLoading", false);
    setTimeout(() => notifyDataModeChanged(), 0);
    toast.success("Developer settings reset to default");
  }, [updateLocalSetting, notifyDataModeChanged]);

  // Calculate active developer features count (excluding default/off states)
  const activeDevModesCount =
    (devSettings.simulateSkeletonLoading ? 1 : 0) +
    (devSettings.networkLatencyMs > 0 ? 1 : 0) +
    (devSettings.chaosErrorMode !== "none" ? 1 : 0) +
    (devSettings.simulateEmptyState ? 1 : 0) +
    (devSettings.seedTakeoverPreset && devSettings.seedTakeoverPreset !== "none" ? 1 : 0) +
    (devSettings.simulatedRole !== "none" ? 1 : 0) +
    (devSettings.simulateSseDisconnect ? 1 : 0) +
    (devSettings.forceReducedMotion ? 1 : 0) +
    (devSettings.fontFamily && devSettings.fontFamily !== "helvetica" ? 1 : 0) +
    (devSettings.disableEmojiCustomization ? 1 : 0) +
    (devSettings.customPadding !== null && devSettings.customPadding !== undefined ? 1 : 0) +
    (devSettings.customInnerRadius !== null && devSettings.customInnerRadius !== undefined ? 1 : 0) +
    (devSettings.customOuterRadius !== null && devSettings.customOuterRadius !== undefined ? 1 : 0) +
    (devSettings.columnColorStyle && devSettings.columnColorStyle !== "theme" ? 1 : 0) +
    (devSettings.taskModalHideLabelIcons ? 1 : 0) +
    (devSettings.taskModalLabelCase && devSettings.taskModalLabelCase !== "uppercase" ? 1 : 0);

  return (
    <DevModeContext.Provider
      value={{
        devSettings,
        updateDevSetting,
        resetDevSettings,
        resetSeedSandbox,
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
      resetSeedSandbox: () => {},
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
