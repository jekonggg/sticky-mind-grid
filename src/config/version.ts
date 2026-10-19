export const APP_VERSION = "1.3.0";

// Dynamically injected at build/dev time by Vite/Vitest from git rev-parse --short HEAD or deployment SHA
export const COMMIT_HASH: string =
  typeof __COMMIT_HASH__ !== "undefined" && __COMMIT_HASH__
    ? __COMMIT_HASH__
    : (import.meta.env?.VITE_COMMIT_HASH as string) || "dev";

export const FULL_VERSION = `${APP_VERSION} (${COMMIT_HASH})`;
