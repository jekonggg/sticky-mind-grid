import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, Laptop, Sparkles, Check, RotateCcw, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeMode, UIDensity } from "@/types/settings";

export function AppearanceTab() {
  const { settings, updateLocalSetting, resetLocalSettings } = useSettings();

  const themeOptions: { mode: ThemeMode; label: string; desc: string; icon: LucideIcon }[] = [
    {
      mode: "light",
      label: "Light",
      desc: "Clean & bright interface",
      icon: Sun,
    },
    {
      mode: "dark",
      label: "Dark",
      desc: "Sleek & comfortable at night",
      icon: Moon,
    },
    {
      mode: "system",
      label: "System",
      desc: "Syncs with OS preferences",
      icon: Laptop,
    },
  ];

  const densityOptions: { mode: UIDensity; label: string; desc: string }[] = [
    {
      mode: "comfortable",
      label: "Comfortable",
      desc: "Default spacious card margins and padding",
    },
    {
      mode: "compact",
      label: "Compact",
      desc: "Higher information density for large boards",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Appearance & Interface</h3>
        <p className="text-xs text-muted-foreground">
          Customize how Sticky Mind Grid looks and feels on this device.
        </p>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Theme Preference
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themeOptions.map((opt) => {
            const isSelected = settings.theme === opt.mode;
            const Icon = opt.icon;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => updateLocalSetting("theme", opt.mode)}
                className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border/60 bg-card hover:bg-muted/50 hover:border-border"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center mb-2.5 ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-foreground">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* UI Density Selection */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          UI Density
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {densityOptions.map((opt) => {
            const isSelected = settings.uiDensity === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => updateLocalSetting("uiDensity", opt.mode)}
                className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                    : "border-border/60 bg-card hover:bg-muted/50 hover:border-border"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                )}
                <span className="font-bold text-xs text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reduced Motion Toggle */}
      <div className="space-y-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
          <div className="space-y-0.5">
            <Label htmlFor="reduced-motion" className="text-xs font-bold text-foreground cursor-pointer">
              Reduced Motion
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Minimize non-essential UI animations and transitions
            </p>
          </div>
          <Switch
            id="reduced-motion"
            checked={settings.reducedMotion}
            onCheckedChange={(checked) => updateLocalSetting("reducedMotion", checked)}
          />
        </div>
      </div>

      {/* Reset Defaults */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          Reset all local display settings to default values.
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetLocalSettings}
          className="h-8 text-xs gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Defaults
        </Button>
      </div>
    </div>
  );
}
