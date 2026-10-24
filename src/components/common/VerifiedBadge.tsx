import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type VerifiedBadgeSize = "xs" | "sm" | "md" | "lg" | "xl";
export type VerifiedBadgeVariant = "icon" | "chip" | "avatar-badge";

export interface VerifiedBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: VerifiedBadgeSize;
  variant?: VerifiedBadgeVariant;
  showTooltip?: boolean;
  tooltipText?: string;
  isVerified?: boolean;
  dataTestId?: string;
}

export interface SolidVerifiedIconProps extends React.SVGAttributes<SVGElement> {
  className?: string;
  badgeColor?: string;
  checkColor?: string;
}

/**
 * Solid verified badge icon with a bold filled starburst and high-contrast white checkmark.
 */
export const SolidVerifiedIcon: React.FC<SolidVerifiedIconProps> = ({
  className,
  badgeColor,
  checkColor = "#ffffff",
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={badgeColor || "currentColor"}
      />
      <path
        d="m9 12 2 2 4-4"
        stroke={checkColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const sizeClasses: Record<VerifiedBadgeSize, { icon: string; container: string; chipText: string }> = {
  xs: {
    icon: "h-3.5 w-3.5",
    container: "h-3.5 w-3.5",
    chipText: "text-[9px] px-1.5 py-0.5 gap-1",
  },
  sm: {
    icon: "h-4 w-4",
    container: "h-4 w-4",
    chipText: "text-[10px] px-1.5 py-0.5 gap-1",
  },
  md: {
    icon: "h-5 w-5",
    container: "h-5 w-5",
    chipText: "text-xs px-2 py-0.5 gap-1.5",
  },
  lg: {
    icon: "h-6 w-6",
    container: "h-6 w-6",
    chipText: "text-xs px-2.5 py-1 gap-1.5",
  },
  xl: {
    icon: "h-7 w-7",
    container: "h-7 w-7",
    chipText: "text-sm px-3 py-1 gap-2",
  },
};

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = "sm",
  variant = "icon",
  showTooltip = true,
  tooltipText = "Verified Account",
  isVerified = true,
  dataTestId = "verified-badge",
  className,
  ...props
}) => {
  if (!isVerified) return null;

  const currentSize = sizeClasses[size];

  let badgeContent: React.ReactNode;

  if (variant === "chip") {
    badgeContent = (
      <span
        data-testid={dataTestId}
        aria-label={tooltipText}
        className={cn(
          "inline-flex items-center font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0 select-none shadow-2xs transition-colors",
          currentSize.chipText,
          className
        )}
        {...props}
      >
        <SolidVerifiedIcon className={cn(currentSize.icon, "shrink-0 text-blue-600 dark:text-blue-500")} />
        <span>Verified</span>
      </span>
    );
  } else if (variant === "avatar-badge") {
    badgeContent = (
      <span
        data-testid={dataTestId}
        aria-label={tooltipText}
        className={cn(
          "absolute -bottom-0.5 -right-0.5 rounded-full bg-background ring-2 ring-background shadow-xs flex items-center justify-center shrink-0 z-10 select-none",
          currentSize.container,
          className
        )}
        {...props}
      >
        <SolidVerifiedIcon className={cn(currentSize.icon, "text-blue-600 dark:text-blue-500")} />
      </span>
    );
  } else {
    // "icon" variant
    badgeContent = (
      <span
        data-testid={dataTestId}
        aria-label={tooltipText}
        className={cn("inline-flex items-center justify-center shrink-0 select-none", className)}
        {...props}
      >
        <SolidVerifiedIcon className={cn(currentSize.icon, "text-blue-600 dark:text-blue-500")} />
      </span>
    );
  }

  if (showTooltip) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs font-medium py-1 px-2.5">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
};
