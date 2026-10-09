import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface PillNavItem<T extends string = string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
  badge?: number | string;
}

export interface PillNavBarProps<T extends string = string> {
  items: readonly PillNavItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  accentColor?: "violet" | "primary" | "emerald" | "amber";
  size?: "sm" | "default";
  className?: string;
  layoutId?: string;
}

export function PillNavBar<T extends string = string>({
  items,
  activeId,
  onChange,
  accentColor = "violet",
  size = "default",
  className,
  layoutId = "metaPillActiveBg",
}: PillNavBarProps<T>) {
  const getAccentClass = () => {
    switch (accentColor) {
      case "violet":
        return "text-purple-600 dark:text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.45)]";
      case "emerald":
        return "text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.45)]";
      case "amber":
        return "text-amber-600 dark:text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]";
      case "primary":
      default:
        return "text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.45)]";
    }
  };

  const isSmall = size === "sm";

  return (
    <nav
      role="tablist"
      aria-label="Navigation View Switcher"
      className={cn(
        "inline-flex items-center p-1.5 rounded-full h-11 box-border",
        "bg-white/90 dark:bg-[#0e0e10]/95",
        "border border-slate-200/80 dark:border-white/[0.12]",
        "backdrop-blur-xl shadow-xl dark:shadow-2xl dark:shadow-black/60 select-none",
        isSmall && "h-9 p-1",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeId === item.id;

        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-2 rounded-full transition-colors cursor-pointer",
              "outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              isSmall ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
              isActive
                ? "text-slate-900 dark:text-white font-bold"
                : "text-slate-600 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-white/[0.05] font-medium"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-slate-100 dark:bg-[#1c1c20] border border-slate-300/80 dark:border-white/10 shadow-sm -z-10"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}

            <Icon
              className={cn(
                isSmall ? "h-3.5 w-3.5" : "h-4 w-4",
                "shrink-0 transition-all duration-200 stroke-[1.75]",
                isActive ? getAccentClass() : "text-muted-foreground/80 group-hover:text-foreground"
              )}
            />

            <span>{item.label}</span>

            {item.badge !== undefined && (
              <span
                className={cn(
                  "ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono leading-tight",
                  isActive
                    ? "bg-primary/15 text-primary dark:text-violet-300 font-bold"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
