import { API_BASE, TOKEN_STORAGE_KEY, getStoredToken } from "@/config/api";
import { getDevSettings } from "@/contexts/DevModeContext";
import { isJwtExpired } from "@/utils/authUtils";

export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  // DEV Mode Interception
  if (import.meta.env.DEV) {
    const devSettings = getDevSettings();

    // 1. Artificial Network Latency
    if (devSettings.networkLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, devSettings.networkLatencyMs));
    }

    // 2. Chaos / Error Mode Injection
    if (devSettings.chaosErrorMode && devSettings.chaosErrorMode !== "none") {
      if (devSettings.chaosErrorMode === "500") {
        return new Response(
          JSON.stringify({ message: "DevMode Simulated Server Error (500)" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      if (devSettings.chaosErrorMode === "403") {
        return new Response(
          JSON.stringify({ message: "DevMode Simulated Forbidden (403)" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }
      if (devSettings.chaosErrorMode === "401") {
        return new Response(
          JSON.stringify({ message: "DevMode Simulated Unauthorized (401)" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      if (devSettings.chaosErrorMode === "network_error") {
        throw new TypeError("Failed to fetch (DevMode Simulated Offline)");
      }
    }

    // 3. Simulate Empty State for list endpoints (GET requests)
    if (devSettings.simulateEmptyState && (!options.method || options.method === "GET")) {
      if (
        endpoint === "/boards" ||
        endpoint === "/tasks" ||
        (endpoint.startsWith("/boards") && endpoint.endsWith("/tasks"))
      ) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
  }

  const token = getStoredToken();

  // Instant client-side check: if token has expired due to inactivity, clear and redirect immediately
  if (token && isJwtExpired(token)) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("auth:session-expired"));
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Handle unauthorized - clear token, notify context, and redirect
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("auth:session-expired"));
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return response;
}
