import { DevFontFamily } from "@/types/devMode";

export interface FontOption {
  id: DevFontFamily;
  name: string;
  category: string;
  fontStack: string;
  sampleText: string;
  description: string;
  badge: string;
}

export const DEV_FONT_OPTIONS: FontOption[] = [
  {
    id: "helvetica",
    name: "Helvetica",
    category: "Neo-Grotesque",
    fontStack: '"Helvetica Neue", Helvetica, Arial, system-ui, -apple-system, sans-serif',
    sampleText: "Sphinx of black quartz, judge my vow.",
    description: "Neutral, balanced, and timeless Swiss modernism.",
    badge: "Swiss Classic",
  },
  {
    id: "inter",
    name: "Inter",
    category: "Variable Sans",
    fontStack: "'Inter', system-ui, -apple-system, sans-serif",
    sampleText: "Sphinx of black quartz, judge my vow.",
    description: "Engineered specifically for computer screens and high-density UIs.",
    badge: "UI Standard",
  },
  {
    id: "montserrat",
    name: "Montserrat",
    category: "Geometric Sans",
    fontStack: "'Montserrat', system-ui, -apple-system, sans-serif",
    sampleText: "Sphinx of black quartz, judge my vow.",
    description: "Geometric, open, and friendly urban poster architecture.",
    badge: "Geometric",
  },
  {
    id: "fraunces",
    name: "Fraunces",
    category: "Old Style Serif",
    fontStack: "'Fraunces', Georgia, serif",
    sampleText: "Sphinx of black quartz, judge my vow.",
    description: "Warm, personality-packed editorial serif with soft vintage curves.",
    badge: "Editorial Serif",
  },
  {
    id: "sora",
    name: "Sora",
    category: "Futuristic Sans",
    fontStack: "'Sora', system-ui, -apple-system, sans-serif",
    sampleText: "Sphinx of black quartz, judge my vow.",
    description: "High-contrast geometric sans designed for modern digital spaces.",
    badge: "Neo-Tech",
  },
  {
    id: "inter_tight",
    name: "Inter Tight",
    category: "Condensed Sans",
    fontStack: '"Inter Tight", system-ui, -apple-system, sans-serif',
    sampleText: "Sphinx of black quartz, judge my vow.",
    description: "Compact horizontal rhythm ideal for data-dense dashboards.",
    badge: "Dense UI",
  },
  {
    id: "satoshi",
    name: "Satoshi",
    category: "Modern Grotesque",
    fontStack: "'Satoshi', system-ui, -apple-system, sans-serif",
    sampleText: "Sphinx of black quartz, judge my vow.",
    description: "Contemporary neo-grotesque blending sharp geometry and human warmth.",
    badge: "Premium Design",
  },
];

export const FONT_STACK_MAP: Record<DevFontFamily, string> = DEV_FONT_OPTIONS.reduce(
  (acc, opt) => ({ ...acc, [opt.id]: opt.fontStack }),
  {} as Record<DevFontFamily, string>
);
