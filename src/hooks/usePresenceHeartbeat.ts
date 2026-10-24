import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { userApi } from "@/services/userApi";
import { CONVERSATIONS_QUERY_KEY } from "@/hooks/useMessages";

const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Keeps the authenticated user's presence alive while the app is open.
 *
 * Presence is heartbeat-based rather than tied to an SSE connection so it
 * works on every authenticated page without consuming an extra long-lived
 * Gunicorn thread. The backend considers a user online for 90 seconds after
 * their last heartbeat, which tolerates background-tab timer throttling.
 */
export function usePresenceHeartbeat() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const authToken = token;
    let cancelled = false;

    const sendHeartbeat = () => {
      if (cancelled) return;
      userApi.heartbeatPresence().catch(() => {
        // Presence is best-effort; a failed beat should never disrupt the UI.
      });
    };

    const handleVisibleOrFocused = () => {
      if (document.visibilityState !== "visible") return;
      sendHeartbeat();
      // Presence rides on the conversation payload, so refresh it when the
      // user returns to the tab to avoid showing stale online indicators.
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
    };

    sendHeartbeat();
    const intervalId = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibleOrFocused);
    window.addEventListener("focus", handleVisibleOrFocused);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibleOrFocused);
      window.removeEventListener("focus", handleVisibleOrFocused);
      userApi.markPresenceOffline(authToken).catch(() => {
        // Logout should still succeed even if the presence beacon fails.
      });
    };
  }, [token, queryClient]);
}
