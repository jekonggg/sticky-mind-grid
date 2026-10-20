export type DevColumnColorStyle =
  | "theme"
  | "glass"
  | "charcoal"
  | "accent_tint"
  | "slate";

export interface ColumnColorStyleDefinition {
  id: DevColumnColorStyle;
  label: string;
  tagline: string;
  description: string;
  previewClass: string;
  badgePreviewClass: string;
  isDefault?: boolean;
}

export const COLUMN_COLOR_STYLES: readonly ColumnColorStyleDefinition[] = [
  {
    id: "theme",
    label: "Theme Adaptive (Neutral)",
    tagline: "Inherits active theme tokens without blue tint",
    description: "Uses semantic surface tokens (bg-muted/40). Blends seamlessly with all colorways in both Light and Dark mode.",
    previewClass: "bg-muted/60 dark:bg-muted/30 border-border/70",
    badgePreviewClass: "bg-muted dark:bg-muted/60 text-muted-foreground",
    isDefault: true,
  },
  {
    id: "glass",
    label: "Frosted Glass (Translucent)",
    tagline: "Modern Linear / Notion translucent pod",
    description: "Card-level translucency with backdrop blur (bg-card/50). Lifts task cards with a sophisticated layered depth.",
    previewClass: "bg-card/60 dark:bg-card/30 backdrop-blur-md border-border/60",
    badgePreviewClass: "bg-background/80 dark:bg-card/60 text-foreground/80",
  },
  {
    id: "charcoal",
    label: "Warm Charcoal & Stone",
    tagline: "Warm neutral editorial contrast",
    description: "Replaces cool blue undertones with warm stone and deep dark zinc (bg-stone-100 / bg-zinc-950). Grounded & clean.",
    previewClass: "bg-stone-100/90 dark:bg-zinc-950/70 border-stone-300/70 dark:border-zinc-800/80",
    badgePreviewClass: "bg-stone-200/90 dark:bg-zinc-800/80 text-stone-700 dark:text-zinc-300",
  },
  {
    id: "accent_tint",
    label: "Workflow Stage Ambient Tint",
    tagline: "Subtle stage-aware ambient hue",
    description: "Soft ambient tinting tailored per stage (rose for Todo, amber for In Progress, purple for Review, emerald for Done).",
    previewClass: "bg-amber-500/[0.08] dark:bg-amber-950/25 border-amber-500/30",
    badgePreviewClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    id: "slate",
    label: "Classic Slate Blue (Legacy)",
    tagline: "Original cool-slate blue default",
    description: "Original legacy cool slate background (bg-slate-100 / bg-slate-900). Retained for side-by-side comparison in Dev Suite.",
    previewClass: "bg-slate-100/85 dark:bg-slate-900/60 border-slate-300/80 dark:border-slate-800/90",
    badgePreviewClass: "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  },
];
