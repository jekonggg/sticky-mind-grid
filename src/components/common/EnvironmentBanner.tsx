import { useEffect } from "react";

export interface EnvironmentBannerProps {
  envOverride?: string;
  apiBaseOverride?: string;
  commitHashOverride?: string;
}

function extractApiHost(apiUrl: string): string {
  try {
    return new URL(apiUrl).host || apiUrl;
  } catch {
    return apiUrl;
  }
}

export function EnvironmentBanner({
  envOverride,
  apiBaseOverride,
  commitHashOverride,
}: EnvironmentBannerProps = {}) {
  const rawEnv = String(envOverride ?? import.meta.env.VITE_APP_ENV ?? "")
    .trim()
    .toLowerCase();
  const isNonProdEnv =
    rawEnv !== "" && rawEnv !== "production" && rawEnv !== "prod";
  const envLabel = rawEnv === "development" ? "DEV" : rawEnv.toUpperCase();

  useEffect(() => {
    if (!isNonProdEnv) return;
    const prefix = `[${envLabel}] `;
    const previousTitle = document.title;
    if (!document.title.startsWith("[")) {
      document.title = `${prefix}${previousTitle}`;
    }
    return () => {
      if (document.title.startsWith(prefix)) {
        document.title = previousTitle;
      }
    };
  }, [isNonProdEnv, envLabel]);

  if (!isNonProdEnv) {
    return null;
  }

  const commit =
    commitHashOverride ??
    (typeof __COMMIT_HASH__ !== "undefined" ? __COMMIT_HASH__ : "dev");
  const apiUrl =
    apiBaseOverride ??
    import.meta.env.VITE_API_BASE_URL ??
    "http://127.0.0.1:5000/api";
  const apiHost = extractApiHost(apiUrl);

  return (
    <div
      role="status"
      aria-label="Deployment environment indicator"
      data-testid="environment-banner"
      className="w-full bg-amber-500/95 text-slate-950 text-[11px] font-bold tracking-wide px-3 py-1 flex items-center justify-center gap-2 z-50 select-none border-b border-amber-600/40"
    >
      <span>{envLabel} ENVIRONMENT</span>
      <span aria-hidden="true">•</span>
      <span className="font-mono font-semibold">commit {commit}</span>
      <span aria-hidden="true">•</span>
      <span className="font-mono font-semibold">API: {apiHost}</span>
    </div>
  );
}
