/**
 * Environment helpers for feature flags and developer tools.
 */

export function isDevSuiteEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // Local development with Vite (vite dev server)
  if (import.meta.env.DEV) {
    return true;
  }

  // Deployed development / staging environments (e.g., Render develop branch with VITE_APP_ENV=dev)
  const env = String(import.meta.env.VITE_APP_ENV ?? "")
    .trim()
    .toLowerCase();

  return env === "dev" || env === "development" || env === "staging";
}
