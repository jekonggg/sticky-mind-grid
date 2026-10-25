import React, { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DevSuiteModal } from "@/components/dev/DevSuiteModal";
import { DEV_FONT_OPTIONS } from "@/constants/fonts";
import { SEED_PRESET_OPTIONS } from "@/data/devSeedDataset";
import {
  Stars01 as Sparkles,
  EyeOff,
  Sliders01 as Sliders,
  ChevronDown,
} from "@untitledui/icons";

export function DevSkeletonToolbar() {
  const { settings, updateLocalSetting } = useSettings();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("smg_dev_toolbar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("smg_dev_toolbar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

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
      {/* 1. When Active Modes Exist AND Toolbar is Expanded */}
      {hasActiveModes && !isCollapsed && (
        <aside
          aria-label="Developer Mode Toolbar"
          data-collapsed="false"
          className="fixed bottom-5 right-3.5 left-3.5 sm:left-auto sm:right-5 z-50 flex items-center gap-3 p-3 px-4 rounded-2xl bg-card/90 dark:bg-card/90 backdrop-blur-xl border border-amber-500/40 text-foreground shadow-2xl shadow-amber-500/10 animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
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

                {devSettings.seedTakeoverPreset && devSettings.seedTakeoverPreset !== "none" && (
                  <Badge
                    data-testid="toolbar-seed-badge"
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                  >
                    🌱 Seed:{" "}
                    {SEED_PRESET_OPTIONS.find((p) => p.id === devSettings.seedTakeoverPreset)
                      ?.shortBadge || devSettings.seedTakeoverPreset}
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

                {devSettings.fontFamily && devSettings.fontFamily !== "helvetica" && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30 font-bold">
                    🔤 {DEV_FONT_OPTIONS.find((f) => f.id === devSettings.fontFamily)?.name || devSettings.fontFamily}
                  </Badge>
                )}

                {devSettings.disableEmojiCustomization && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold">
                    🚫 No Emojis
                  </Badge>
                )}

                {devSettings.taskModalHideLabelIcons && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold">
                    🏷️ No Label Icons
                  </Badge>
                )}

                {devSettings.taskModalLabelCase === "capitalize" && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30 font-bold">
                    🔤 Title Case Labels
                  </Badge>
                )}

                {(devSettings.customPadding !== null && devSettings.customPadding !== undefined ||
                  devSettings.customInnerRadius !== null && devSettings.customInnerRadius !== undefined ||
                  devSettings.customOuterRadius !== null && devSettings.customOuterRadius !== undefined) && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold font-mono">
                    📐 Geometry (
                    {devSettings.customOuterRadius !== null && devSettings.customOuterRadius !== undefined
                      ? `${devSettings.customOuterRadius}o / ${devSettings.customInnerRadius ?? "def"}i / ${devSettings.customPadding ?? "def"}p`
                      : `${devSettings.customInnerRadius ?? "def"}r / ${devSettings.customPadding ?? "def"}p`}
                    )
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/60">
            {/* Collapse Button */}
            <button
              type="button"
              onClick={toggleCollapse}
              aria-label="Collapse dev toolbar"
              data-testid="dev-toolbar-collapse-btn"
              title="Collapse dev toolbar"
              className="h-7 w-7 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

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

      {/* 2. When Collapsed OR Idle: Floating "Dev Mode" Button */}
      {(!hasActiveModes || isCollapsed) && (
        <div className="fixed bottom-5 right-3.5 md:right-5 z-40 animate-in fade-in duration-300">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (hasActiveModes && isCollapsed) {
                // Expanding the active container
                toggleCollapse();
              } else {
                // Opening the modal when idle
                setIsDevModalOpen(true);
              }
            }}
            data-testid="dev-mode-floating-btn"
            aria-label={hasActiveModes && isCollapsed ? "Expand dev toolbar" : "Open Developer Suite"}
            className="h-8.5 px-3 text-xs font-bold bg-card/90 hover:bg-card border-border/80 shadow-lg hover:shadow-xl backdrop-blur-md text-foreground gap-1.5 rounded-full hover:border-amber-500/50 transition-all hover:scale-105 cursor-pointer group"
          >
            <div className="h-4 w-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-amber-950 transition-colors">
              <Sliders className="h-2.5 w-2.5" />
            </div>
            <span className="text-[11px] font-bold">
              {hasActiveModes ? `Dev Mode (${activeDevModesCount || 1})` : "Dev Mode"}
            </span>
            {hasActiveModes && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
            )}
            {!hasActiveModes && (
              <kbd className="hidden sm:inline font-mono text-[9px] bg-muted/80 text-muted-foreground px-1 py-0.2 rounded border border-border/60">
                Ctrl+Alt+D
              </kbd>
            )}
          </Button>
        </div>
      )}

      {/* Developer Suite Modal Dialog */}
      <DevSuiteModal />
    </>
  );
}
