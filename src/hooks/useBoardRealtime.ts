import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { toast } from "sonner";
import { API_BASE, getStoredToken } from "@/config/api";
import { queryKeys } from "@/config/queryKeys";

interface RealtimeEvent {
  type: string;
  boardId: string;
  data: any;
  timestamp: string;
}

interface UseBoardRealtimeOptions {
  boardId?: string | null;
  onTaskChange?: () => void;
  onTaskUpdate?: (task: any) => void;
  onTaskDelete?: (taskId: string) => void;
  onActivityChange?: (activity: any) => void;
  onMemberChange?: () => void;
  onBoardChange?: (board: any) => void;
}

export function useBoardRealtime({
  boardId,
  onTaskChange,
  onTaskUpdate,
  onTaskDelete,
  onActivityChange,
  onMemberChange,
  onBoardChange,
}: UseBoardRealtimeOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { devSettings } = useDevMode();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep latest callbacks in ref without triggering reconnection loops
  const callbacksRef = useRef({
    onTaskChange,
    onTaskUpdate,
    onTaskDelete,
    onActivityChange,
    onMemberChange,
    onBoardChange,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTaskChange,
      onTaskUpdate,
      onTaskDelete,
      onActivityChange,
      onMemberChange,
      onBoardChange,
    };
  });

  const userId = user?.id;

  useEffect(() => {
    // Check if SSE disconnect is simulated via Developer Mode
    if (devSettings.simulateSseDisconnect) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    if (!boardId || !userId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const token = getStoredToken();
    if (!token) return;

    let isMounted = true;

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const url = `${API_BASE}/boards/${boardId}/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isMounted) setIsConnected(true);
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
              if (isMounted) setIsConnected(true);
              if (boardId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.board(boardId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
                queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
                queryClient.invalidateQueries({ queryKey: queryKeys.boards.members(boardId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.notes.board(boardId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.activity.board(boardId) });
              }
              break;

            case "task:created":
            case "task:moved":
            case "tasks:reordered":
              if (boardId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.board(boardId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
                queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
              }
              callbacksRef.current.onTaskChange?.();
              break;

            case "task:updated":
              if (boardId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.board(boardId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
              }
              callbacksRef.current.onTaskChange?.();
              callbacksRef.current.onTaskUpdate?.(payload.data);
              break;

            case "task:deleted":
              if (boardId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.board(boardId) });
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
                queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
              }
              callbacksRef.current.onTaskChange?.();
              callbacksRef.current.onTaskDelete?.(payload.data?.taskId || payload.data?.id || payload.data);
              break;

            case "activity:new":
              if (boardId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.activity.board(boardId) });
              }
              callbacksRef.current.onActivityChange?.(payload.data);
              break;

            case "member:joined":
            case "member:removed":
            case "member:role_updated":
              if (boardId) {
                queryClient.invalidateQueries({ queryKey: queryKeys.boards.members(boardId) });
              }
              callbacksRef.current.onMemberChange?.();
              break;

            case "board:updated":
              queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
              callbacksRef.current.onBoardChange?.(payload.data);
              break;

            default:
              break;
          }
        } catch (err) {
          // Ignore unparseable or ping frames
        }
      };

      es.onerror = () => {
        if (isMounted) setIsConnected(false);
        es.close();

        // Attempt reconnect after 3 seconds
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMounted && boardId) connect();
        }, 3000);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [boardId, userId, devSettings.simulateSseDisconnect, queryClient]);

  return { isConnected };
}
