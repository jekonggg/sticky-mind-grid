import React from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DevSuiteModal } from "@/components/dev/DevSuiteModal";
import {
  Sparkles,
  EyeOff,
  Sliders,
  Wifi,
  Flame,
  Shield,
  Radio,
  FileCode,
} from "lucide-react";

export function DevSkeletonToolbar() {
  const { settings, updateLocalSetting } = useSettings();
  const {
    devSettings,
    updateDevSetting,
    isDevModalOpen,
    setIsDevModalOpen,
    activeDevModesCount,
    resetDevSettings,
  } = useDevMode();

  if (!import.meta.env.DEV) {
    return null;
  }

  const isSimulating = settings.simulateSkeletonLoading || devSettings.simulateSkeletonLoading;
  const hasActiveModes = isSimulating || activeDevModesCount > 0;

  return (
    <>
      {hasActiveModes && (
        <aside
          aria-label="Developer Mode Toolbar"
          className="fixed bottom-24 right-3.5 left-3.5 sm:bottom-24 sm:left-auto sm:right-5 md:bottom-5 md:left-auto z-50 flex items-center gap-3 p-3 px-4 rounded-2xl bg-card/90 dark:bg-card/90 backdrop-blur-xl border border-amber-500/40 text-foreground shadow-2xl shadow-amber-500/10 animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
        >
          {/* Status Indicator & Badges */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 truncate">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {isSimulating
                    ? "Dev Mode: Skeleton Simulator Active"
                    : `Dev Suite Active (${activeDevModesCount} modes)`}
                </span>
              </div>

              {/* Secondary badges / hint */}
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {isSimulating && (
                  <span className="text-[10px] text-muted-foreground mr-1">
                    Press <kbd className="font-mono font-semibold bg-muted/60 px-1 py-0.5 rounded text-[9px]">Ctrl + Alt + S</kbd>
                  </span>
                )}

                {devSettings.networkLatencyMs > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30 font-mono font-bold">
                    ⚡ {devSettings.networkLatencyMs}ms
                  </Badge>
                )}

                {devSettings.chaosErrorMode !== "none" && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 font-mono font-bold">
                    💥 {devSettings.chaosErrorMode}
                  </Badge>
                )}

                {devSettings.simulatedRole !== "none" && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-bold">
                    🎭 {devSettings.simulatedRole}
                  </Badge>
                )}

                {devSettings.simulateEmptyState && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold">
                    📭 Empty
                  </Badge>
                )}

                {devSettings.simulateSseDisconnect && (
                  <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 font-bold">
                    📡 SSE Dropped
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
            {/* Open Full Dev Suite */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDevModalOpen(true)}
              className="h-7 px-2.5 text-xs font-bold bg-background/80 hover:bg-background border-border/60 gap-1.5 cursor-pointer"
              title="Open Developer Suite modal"
            >
              <Sliders className="h-3 w-3 text-primary" />
              <span className="hidden sm:inline">Tools</span>
            </Button>

            {/* Quick Exit / Clear button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (isSimulating) {
                  updateLocalSetting("simulateSkeletonLoading", false);
                  updateDevSetting("simulateSkeletonLoading", false);
                }
                if (activeDevModesCount > 0) {
                  resetDevSettings();
                }
              }}
              className="h-7 px-2.5 text-xs font-bold bg-background/80 hover:bg-background border-amber-500/40 text-amber-900 dark:text-amber-100 gap-1 cursor-pointer"
            >
              <EyeOff className="h-3 w-3" />
              <span>Exit</span>
            </Button>
          </div>
        </aside>
      )}

      {/* Idle Quick-Access Floating Button */}
      {!hasActiveModes && (
        <div className="fixed bottom-24 right-3.5 sm:bottom-24 md:bottom-5 md:right-5 z-40 animate-in fade-in duration-300">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDevModalOpen(true)}
            aria-label="Open Developer Suite"
            className="h-8.5 px-3 text-xs font-bold bg-card/90 hover:bg-card border-border/80 shadow-lg hover:shadow-xl backdrop-blur-md text-foreground gap-1.5 rounded-full hover:border-amber-500/50 transition-all hover:scale-105 cursor-pointer group"
          >
            <div className="h-4 w-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-amber-950 transition-colors">
              <Sliders className="h-2.5 w-2.5" />
            </div>
            <span className="text-[11px] font-bold">Dev Mode</span>
            <kbd className="hidden sm:inline font-mono text-[9px] bg-muted/80 text-muted-foreground px-1 py-0.2 rounded border border-border/60">
              Ctrl+Alt+D
            </kbd>
          </Button>
        </div>
      )}

      {/* Developer Suite Modal Dialog */}
      <DevSuiteModal />
    </>
  );
}
