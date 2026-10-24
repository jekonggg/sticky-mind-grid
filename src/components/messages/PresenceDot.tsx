interface PresenceDotProps {
  isOnline?: boolean;
  className?: string;
}

/**
 * Small avatar status badge. Green means the user has an active session;
 * muted gray means they are offline or their presence is unknown.
 */
export function PresenceDot({ isOnline = false, className = "" }: PresenceDotProps) {
  const label = isOnline ? "Online" : "Offline";

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-card transition-colors ${
        isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
      } ${className}`}
    />
  );
}
