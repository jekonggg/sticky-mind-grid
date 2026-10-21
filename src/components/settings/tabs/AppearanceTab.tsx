import React, { useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sun,
  Moon01 as Moon,
  Monitor01 as Laptop,
  Stars01 as Sparkles,
  Check,
  RefreshCcw01 as RotateCcw,
  Palette,
  Sliders01 as Sliders,
} from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { ThemeMode, UIDensity, ThemeColorway } from "@/types/settings";

interface ColorwayOption {
  id: ThemeColorway;
  label: string;
  desc: string;
  lightHex: string;
  darkHex: string;
  lightBg: string;
  darkBg: string;
}

export function AppearanceTab() {
  const { settings, updateLocalSetting, resetLocalSettings } = useSettings();
  const [showCustomAccent, setShowCustomAccent] = useState(Boolean(settings.customAccentColor));

  const themeOptions: { mode: ThemeMode; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      mode: "light",
      label: "Light",
      desc: "Clean white & floating cards (Default)",
      icon: Sun,
    },
    {
      mode: "dark",
      label: "Dark",
      desc: "Multi-tiered obsidian & rich accents",
      icon: Moon,
    },
    {
      mode: "system",
      label: "System",
      desc: "Syncs with OS display preferences",
      icon: Laptop,
    },
  ];

  const colorwayOptions: ColorwayOption[] = [
    {
      id: "indigo",
      label: "Linear Indigo & Slate",
      desc: "Royal sapphire indigo with clean slate surfaces (Linear style)",
      lightHex: "#4F46E5",
      darkHex: "#6366F1",
      lightBg: "#FFFFFF",
      darkBg: "#030712",
    },
    {
      id: "mast",
      label: "Pitch Black & Pastel",
      desc: "Jet pitch black with electric lilac & candy glow (Mast style)",
      lightHex: "#9333EA",
      darkHex: "#C084FC",
      lightBg: "#FAF5FF",
      darkBg: "#0F0F10",
    },
    {
      id: "neon",
      label: "Obsidian & Neon Lime",
      desc: "Matte obsidian with electric chartreuse accent (One Agency style)",
      lightHex: "#65A30D",
      darkHex: "#A3E635",
      lightBg: "#F7FEE7",
      darkBg: "#0D0E11",
    },
    {
      id: "emerald",
      label: "Forest & Emerald Mint",
      desc: "Sage surfaces with vibrant emerald mint highlights",
      lightHex: "#059669",
      darkHex: "#34D399",
      lightBg: "#ECFDF5",
      darkBg: "#061A12",
    },
    {
      id: "sunset",
      label: "Sunset Amber & Coral",
      desc: "Warm glowing amber with rich sunset coral tones",
      lightHex: "#EA580C",
      darkHex: "#FBBF24",
      lightBg: "#FFF7ED",
      darkBg: "#1C1208",
    },
    {
      id: "rose",
      label: "Rose & Crimson Noir",
      desc: "Sophisticated ruby rose with velvet noir contrast",
      lightHex: "#E11D48",
      darkHex: "#FB7185",
      lightBg: "#FFF1F2",
      darkBg: "#1A080D",
    },
    {
      id: "ocean",
      label: "Abyss Ocean & Cyan",
      desc: "Deep oceanic azure with vibrant cyan neon glow",
      lightHex: "#0284C7",
      darkHex: "#22D3EE",
      lightBg: "#F0F9FF",
      darkBg: "#041521",
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

  const activeColorway = settings.colorTheme || (settings.darkColorway as ThemeColorway) || "mast";

  const handleSelectColorway = (id: ThemeColorway) => {
    updateLocalSetting("colorTheme", id);
    if (settings.customAccentColor) {
      updateLocalSetting("customAccentColor", undefined);
    }
  };

  const handleCustomAccentChange = (hex: string) => {
    updateLocalSetting("customAccentColor", hex);
  };

  const handleClearCustomAccent = () => {
    updateLocalSetting("customAccentColor", undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground">Appearance & Interface</h3>
        <p className="text-xs text-muted-foreground">
          Customize how Sticky Mind Grid looks and feels on this device.
        </p>
      </div>

      {/* 1. Theme Preference */}
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

      {/* 2. System Theme & Colorway Selection (Light & Dark) */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" />
              System Theme & Colorways
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Personalizes accents, surfaces, and active highlights in both Light and Dark modes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
              Light & Dark Ready
            </span>
          </div>
        </div>

        {/* Colorway Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {colorwayOptions.map((opt) => {
            const isSelected = activeColorway === opt.id && !settings.customAccentColor;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectColorway(opt.id)}
                className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all group ${
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

                {/* Dual-Mode Split Swatch Pill */}
                <div className="h-8 w-full rounded-lg border border-border/70 overflow-hidden flex mb-2.5 shadow-2xs">
                  {/* Left Half: Light Mode Accent & Surface */}
                  <div
                    className="flex-1 flex items-center justify-between px-2 transition-transform"
                    style={{ backgroundColor: opt.lightBg }}
                  >
                    <span className="text-[9px] font-bold" style={{ color: opt.lightHex }}>
                      Day
                    </span>
                    <div
                      className="h-2.5 w-2.5 rounded-full shadow-2xs"
                      style={{ backgroundColor: opt.lightHex }}
                    />
                  </div>
                  {/* Right Half: Dark Mode Accent & Surface */}
                  <div
                    className="flex-1 flex items-center justify-between px-2 transition-transform"
                    style={{ backgroundColor: opt.darkBg }}
                  >
                    <span className="text-[9px] font-bold" style={{ color: opt.darkHex }}>
                      Night
                    </span>
                    <div
                      className="h-2.5 w-2.5 rounded-full shadow-2xs"
                      style={{ backgroundColor: opt.darkHex }}
                    />
                  </div>
                </div>

                <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                  {opt.label}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Live Interactive Theme Preview Card */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live Theme Preview
            </span>
            <span className="text-[10px] text-muted-foreground">
              Current active system palette
            </span>
          </div>

          <div className="p-3 rounded-lg bg-card border border-border/80 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                In Progress
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">TASK-104</span>
            </div>

            <div>
              <p className="text-xs font-bold text-foreground leading-tight">
                Design intuitive responsive workflows & theme tokens
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Accent highlights and primary interactive controls reflect your chosen theme.
              </p>
            </div>

            {/* Progress Bar in Primary */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                <span>Progress</span>
                <span className="text-primary font-bold">75%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: "75%" }}
                />
              </div>
            </div>

            {/* Simulated Action Button */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
                  U
                </div>
                <span className="text-[10px] text-muted-foreground">Assigned to you</span>
              </div>
              <button
                type="button"
                className="h-6 px-2.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs hover:opacity-90 transition-opacity"
              >
                Complete Task
              </button>
            </div>
          </div>
        </div>

        {/* 4. Advanced: Custom Primary Accent Color */}
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCustomAccent(!showCustomAccent)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="h-3.5 w-3.5" />
              {showCustomAccent ? "Hide Custom Primary Accent" : "Advanced: Custom Primary Accent Color"}
            </button>
            {settings.customAccentColor && (
              <button
                type="button"
                onClick={handleClearCustomAccent}
                className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                Reset to Theme Default
              </button>
            )}
          </div>

          {showCustomAccent && (
            <div className="mt-2.5 p-3 rounded-xl bg-card border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground">Custom Primary Color</span>
                <p className="text-[10px] text-muted-foreground">
                  Pick any custom color for buttons, rings, and active indicators.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.customAccentColor || "#4F46E5"}
                  onChange={(e) => handleCustomAccentChange(e.target.value)}
                  className="h-8 w-12 rounded cursor-pointer border border-border/60 bg-transparent p-0.5"
                  title="Pick custom primary color"
                />
                <input
                  type="text"
                  value={settings.customAccentColor || ""}
                  placeholder="#4F46E5"
                  onChange={(e) => handleCustomAccentChange(e.target.value)}
                  className="h-8 w-24 text-xs font-mono px-2 rounded-md bg-muted/50 border border-border/60 text-foreground"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. UI Density Selection */}
      <div className="space-y-3 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            UI Density
          </Label>
          <span className="text-[10px] text-muted-foreground font-medium">
            Applies to Boards, Lists, and Cards
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {densityOptions.map((opt) => {
            const isSelected = (settings.uiDensity || "comfortable") === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => updateLocalSetting("uiDensity", opt.mode)}
                className={`relative flex flex-col items-start p-3.5 rounded-xl border text-left transition-all group ${
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
                
                {/* Visual Density Preview Mock */}
                <div className="w-full h-14 rounded-lg bg-muted/40 border border-border/40 p-2 mb-2.5 flex flex-col justify-center overflow-hidden">
                  {opt.mode === "comfortable" ? (
                    <div className="bg-card rounded-md border border-border/60 p-1.5 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="h-1.5 w-16 bg-foreground/70 rounded-full" />
                        <div className="h-1.5 w-6 bg-primary/40 rounded-full" />
                      </div>
                      <div className="h-1 w-24 bg-muted-foreground/30 rounded-full" />
                      <div className="flex items-center justify-between pt-0.5">
                        <div className="h-1 w-8 bg-muted-foreground/20 rounded-full" />
                        <div className="h-2 w-2 rounded-full bg-primary/60" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="bg-card rounded border border-border/60 px-1.5 py-0.5 shadow-2xs flex items-center justify-between">
                        <div className="h-1.5 w-14 bg-foreground/70 rounded-full" />
                        <div className="h-1.5 w-5 bg-primary/40 rounded-full" />
                      </div>
                      <div className="bg-card rounded border border-border/60 px-1.5 py-0.5 shadow-2xs flex items-center justify-between">
                        <div className="h-1.5 w-12 bg-foreground/70 rounded-full" />
                        <div className="h-1.5 w-4 bg-emerald-500/40 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                <span className="font-bold text-xs text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. Reduced Motion Toggle */}
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

      {/* 7. Reset Defaults */}
      <div className="flex flex-col gap-3 pt-4 border-t border-border/50 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">
          Reset all local display settings to default values.
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetLocalSettings}
          className="h-8 w-full text-xs gap-1.5 sm:w-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Defaults
        </Button>
      </div>
    </div>
  );
}
