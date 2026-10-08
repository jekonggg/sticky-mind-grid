import React from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Sparkles, EyeOff, X } from "lucide-react";

export function DevSkeletonToolbar() {
  const { settings, updateLocalSetting } = useSettings();

  if (!settings.simulateSkeletonLoading) {
    return null;
  }

  return (
    <aside
      aria-label="Developer Mode Toolbar"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-3 p-3 px-4 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 backdrop-blur-xl border border-amber-500/40 text-foreground shadow-2xl shadow-amber-500/10 animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
    >
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dev Mode: Skeleton Simulator Active</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Press <kbd className="font-mono font-semibold bg-muted/60 px-1 py-0.5 rounded text-[9px]">Ctrl + Alt + S</kbd> anytime to toggle
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 pl-2 border-l border-amber-500/30">
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateLocalSetting("simulateSkeletonLoading", false)}
          className="h-7 px-2.5 text-xs font-bold bg-background/80 hover:bg-background border-amber-500/40 text-amber-900 dark:text-amber-100 gap-1 cursor-pointer"
        >
          <EyeOff className="h-3 w-3" />
          <span>Exit</span>
        </Button>
      </div>
    </aside>
  );
}
