import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { userApi } from "@/services/userApi";
import {
  LocalPreferences,
  UserSyncedPreferences,
  FullSettings,
  ThemeMode,
  UIDensity,
  BoardViewMode,
  DateFormatOption,
} from "@/types/settings";

const LOCAL_PREFS_KEY = "sticky_mind_grid_local_settings";

const defaultLocalPreferences: LocalPreferences = {
  theme: "system",
  uiDensity: "comfortable",
  soundEffectsEnabled: true,
  soundVolume: 0.3,
  reducedMotion: false,
  autoProgressSnapping: true,
  confirmOnDelete: true,
};

const defaultSyncedPreferences: UserSyncedPreferences = {
  defaultBoardView: "board",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dateFormat: "MM/DD/YYYY",
  firstDayOfWeek: 0,
  notifyMentions: true,
  notifyAssignments: true,
  notifyInvites: true,
  notifyComments: true,
};

interface SettingsContextValue {
  settings: FullSettings;
  updateLocalSetting: <K extends keyof LocalPreferences>(
    key: K,
    val: LocalPreferences[K]
  ) => void;
  updateSyncedSetting: <K extends keyof UserSyncedPreferences>(
    key: K,
    val: UserSyncedPreferences[K]
  ) => Promise<void>;
  resetLocalSettings: () => void;
  playSound: (type: "move" | "complete" | "delete" | "notify") => void;
  isSyncing: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // 1. Initialize local preferences from localStorage
  const [localPrefs, setLocalPrefs] = useState<LocalPreferences>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_PREFS_KEY);
      if (stored) {
        return { ...defaultLocalPreferences, ...JSON.parse(stored) };
      }
    } catch {
      // Fallback
    }
    return defaultLocalPreferences;
  });

  // 2. Initialize synced preferences
  const [syncedPrefs, setSyncedPrefs] = useState<UserSyncedPreferences>(defaultSyncedPreferences);
  const [isSyncing, setIsSyncing] = useState(false);

  // Audio Context Ref for Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync theme with next-themes if different
  useEffect(() => {
    if (theme && (theme === "light" || theme === "dark" || theme === "system")) {
      setLocalPrefs((prev) => (prev.theme !== theme ? { ...prev, theme: theme as ThemeMode } : prev));
    }
  }, [theme]);

  // Fetch user synced preferences when authenticated
  useEffect(() => {
    if (!user) {
      setSyncedPrefs(defaultSyncedPreferences);
      return;
    }

    let isMounted = true;
    setIsSyncing(true);

    userApi
      .getPreferences()
      .then((data) => {
        if (isMounted && data) {
          setSyncedPrefs((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((err) => {
        console.warn("Failed to load user preferences from backend, using defaults", err);
      })
      .finally(() => {
        if (isMounted) setIsSyncing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Update local setting
  const updateLocalSetting = useCallback(
    <K extends keyof LocalPreferences>(key: K, val: LocalPreferences[K]) => {
      setLocalPrefs((prev) => {
        const next = { ...prev, [key]: val };
        try {
          localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(next));
        } catch {
          // Ignore write error
        }
        return next;
      });

      if (key === "theme") {
        setTheme(val as string);
      }
    },
    [setTheme]
  );

  // Update synced backend setting
  const updateSyncedSetting = useCallback(
    async <K extends keyof UserSyncedPreferences>(
      key: K,
      val: UserSyncedPreferences[K]
    ) => {
      // Optimistic update
      setSyncedPrefs((prev) => ({ ...prev, [key]: val }));

      if (user) {
        setIsSyncing(true);
        try {
          const updated = await userApi.updatePreferences({ [key]: val });
          setSyncedPrefs((prev) => ({ ...prev, ...updated }));
        } catch (error) {
          console.error("Failed to sync preference with server", error);
        } finally {
          setIsSyncing(false);
        }
      }
    },
    [user]
  );

  const resetLocalSettings = useCallback(() => {
    setLocalPrefs(defaultLocalPreferences);
    setTheme("system");
    localStorage.removeItem(LOCAL_PREFS_KEY);
  }, [setTheme]);

  // Web Audio API Synthesizer
  const playSound = useCallback(
    (type: "move" | "complete" | "delete" | "notify") => {
      if (!localPrefs.soundEffectsEnabled) return;

      try {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }

        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        const now = ctx.currentTime;
        const volume = Math.max(0.01, Math.min(localPrefs.soundVolume, 1));

        if (type === "move") {
          // Soft short click / tap chime (400Hz -> 500Hz, 40ms)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.04);

          gain.gain.setValueAtTime(volume * 0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.045);
        } else if (type === "complete") {
          // Melodic two-note chord (587.33Hz -> 880Hz)
          [
            { freq: 587.33, start: 0, dur: 0.12 },
            { freq: 880, start: 0.08, dur: 0.18 },
          ].forEach(({ freq, start, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(volume * 0.5, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + start);
            osc.stop(now + start + dur + 0.01);
          });
        } else if (type === "delete") {
          // Low damped pop
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

          gain.gain.setValueAtTime(volume * 0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.09);
        } else if (type === "notify") {
          // Gentle triple chime
          [
            { freq: 523.25, start: 0 },
            { freq: 659.25, start: 0.06 },
            { freq: 783.99, start: 0.12 },
          ].forEach(({ freq, start }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + start);

            gain.gain.setValueAtTime(volume * 0.4, now + start);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + start);
            osc.stop(now + start + 0.16);
          });
        }
      } catch (err) {
        // Silently catch audio restrictions
      }
    },
    [localPrefs.soundEffectsEnabled, localPrefs.soundVolume]
  );

  const fullSettings: FullSettings = {
    ...localPrefs,
    ...syncedPrefs,
  };

  return (
    <SettingsContext.Provider
      value={{
        settings: fullSettings,
        updateLocalSetting,
        updateSyncedSetting,
        resetLocalSettings,
        playSound,
        isSyncing,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
