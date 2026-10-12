import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { toast } from "sonner";
import { API_BASE, getStoredToken } from "@/config/api";

interface RealtimeEvent {
  type: string;
  boardId: string;
  data: any;
  timestamp: string;
}

interface UseBoardRealtimeOptions {
  boardId?: string | null;
  onTaskChange?: (data?: any) => void;
  onTaskUpdate?: (task: any) => void;
  onTaskMoved?: (task: any) => void;
  onTasksReordered?: (data: any) => void;
  onTaskDelete?: (taskId: string) => void;
  onActivityChange?: (activity: any) => void;
  onMemberChange?: (data?: any) => void;
  onBoardChange?: (board: any) => void;
  onBoardDeleted?: (data?: any) => void;
  onReconnect?: () => void;
  onForceDisconnect?: (data?: any) => void;
}

export function useBoardRealtime({
  boardId,
  onTaskChange,
  onTaskUpdate,
  onTaskMoved,
  onTasksReordered,
  onTaskDelete,
  onActivityChange,
  onMemberChange,
  onBoardChange,
  onBoardDeleted,
  onReconnect,
  onForceDisconnect,
}: UseBoardRealtimeOptions) {
  const { user, token: authToken } = useAuth();
  const { devSettings } = useDevMode();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnectedOnceRef = useRef(false);
  const needsReconnectSyncRef = useRef(false);

  // Keep latest callbacks in ref without triggering reconnection loops
  const callbacksRef = useRef({
    onTaskChange,
    onTaskUpdate,
    onTaskMoved,
    onTasksReordered,
    onTaskDelete,
    onActivityChange,
    onMemberChange,
    onBoardChange,
    onBoardDeleted,
    onReconnect,
    onForceDisconnect,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTaskChange,
      onTaskUpdate,
      onTaskMoved,
      onTasksReordered,
      onTaskDelete,
      onActivityChange,
      onMemberChange,
      onBoardChange,
      onBoardDeleted,
      onReconnect,
      onForceDisconnect,
    };
  });

  const userId = user?.id;

  useEffect(() => {
    hasConnectedOnceRef.current = false;
    needsReconnectSyncRef.current = false;
  }, [boardId]);

  useEffect(() => {
    // Check if SSE disconnect is simulated via Developer Mode
    if (devSettings.simulateSseDisconnect) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      setIsReconnecting(true);
      needsReconnectSyncRef.current = true;
      return;
    }

    // In Seed Sandbox Mode (e.g. Full System Showcase), mock boards do not exist on the backend SSE server.
    // Simulate active connection without triggering reconnect loops or read-only locks.
    if (devSettings.seedTakeoverPreset && devSettings.seedTakeoverPreset !== "none") {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(true);
      setIsReconnecting(false);
      return;
    }

    if (!boardId || !userId) {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      setIsReconnecting(false);
      return;
    }

    const token = getStoredToken() || authToken;
    let isMounted = true;

    const connect = () => {
      if (!token) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      if (hasConnectedOnceRef.current) {
        needsReconnectSyncRef.current = true;
      }

      const url = `${API_BASE}/boards/${boardId}/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      let openedOnceOnThisInstance = false;
      let connectedMsgOnceOnThisInstance = false;

      es.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
        setIsReconnecting(false);
        if (needsReconnectSyncRef.current || (hasConnectedOnceRef.current && openedOnceOnThisInstance)) {
          needsReconnectSyncRef.current = false;
          callbacksRef.current.onReconnect?.();
        }
        openedOnceOnThisInstance = true;
        hasConnectedOnceRef.current = true;
      };

      es.onmessage = (e) => {
        try {
          const payload: RealtimeEvent = JSON.parse(e.data);
          if (!payload || !payload.type) return;

          if (import.meta.env.DEV && typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("smg-dev-sse-log", {
                detail: { event: payload.type, payload: payload.data || payload },
              })
            );
          }

          switch (payload.type) {
            case "connected":
              if (isMounted) {
                setIsConnected(true);
                setIsReconnecting(false);
                if (needsReconnectSyncRef.current || (hasConnectedOnceRef.current && connectedMsgOnceOnThisInstance)) {
                  needsReconnectSyncRef.current = false;
                  callbacksRef.current.onReconnect?.();
                }
                connectedMsgOnceOnThisInstance = true;
                hasConnectedOnceRef.current = true;
              }
              break;

            case "task:created":
              callbacksRef.current.onTaskChange?.(payload.data);
              break;

            case "task:moved":
              callbacksRef.current.onTaskMoved?.(payload.data);
              callbacksRef.current.onTaskChange?.(payload.data);
              break;

            case "tasks:reordered":
              callbacksRef.current.onTasksReordered?.(payload.data);
              callbacksRef.current.onTaskChange?.(payload.data);
              break;

            case "task:updated":
              callbacksRef.current.onTaskChange?.(payload.data);
              callbacksRef.current.onTaskUpdate?.(payload.data);
              break;

            case "task:deleted":
              callbacksRef.current.onTaskChange?.(payload.data);
              callbacksRef.current.onTaskDelete?.(payload.data?.taskId || payload.data?.id || payload.data);
              break;

            case "activity:new":
              callbacksRef.current.onActivityChange?.(payload.data);
              break;

            case "member:joined":
            case "member:role_updated":
              callbacksRef.current.onMemberChange?.({
                ...(payload.data && typeof payload.data === "object" ? payload.data : {}),
                eventType: payload.type,
              });
              break;

            case "member:removed":
              if (payload.data?.userId && String(payload.data.userId) === String(userId)) {
                if (reconnectTimeoutRef.current) {
                  clearTimeout(reconnectTimeoutRef.current);
                  reconnectTimeoutRef.current = null;
                }
                es.close();
                if (eventSourceRef.current === es) {
                  eventSourceRef.current = null;
                }
                if (isMounted) {
                  setIsConnected(false);
                  setIsReconnecting(false);
                }
              }
              callbacksRef.current.onMemberChange?.({
                ...(payload.data && typeof payload.data === "object" ? payload.data : {}),
                eventType: payload.type,
              });
              break;

            case "force_disconnect":
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
              }
              es.close();
              if (eventSourceRef.current === es) {
                eventSourceRef.current = null;
              }
              if (isMounted) {
                setIsConnected(false);
                setIsReconnecting(false);
              }
              callbacksRef.current.onForceDisconnect?.(payload.data);
              break;

            case "board:updated":
              callbacksRef.current.onBoardChange?.(payload.data);
              break;

            case "board:deleted":
              callbacksRef.current.onBoardDeleted?.(payload.data);
              break;

            default:
              break;
          }
        } catch (err) {
          // Ignore unparseable or ping frames
        }
      };

      es.onerror = () => {
        if (isMounted) {
          setIsConnected(false);
          setIsReconnecting(true);
        }
        needsReconnectSyncRef.current = true;
        es.close();

        // Attempt reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted && boardId) connect();
        }, 3000);
      };
    };

    const handleOffline = () => {
      if (!isMounted) return;
      setIsConnected(false);
      setIsReconnecting(true);
      needsReconnectSyncRef.current = true;
    };

    const handleOnline = () => {
      if (!isMounted) return;
      if (boardId && userId && !devSettings.simulateSseDisconnect) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        needsReconnectSyncRef.current = false;
        connect();
        callbacksRef.current.onReconnect?.();
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    connect();

    return () => {
      isMounted = false;
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [boardId, userId, authToken, devSettings.simulateSseDisconnect, devSettings.seedTakeoverPreset]);

  return { isConnected, isReconnecting };
}
