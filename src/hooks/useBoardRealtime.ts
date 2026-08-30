import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
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

          switch (payload.type) {
            case "connected":
              if (isMounted) setIsConnected(true);
              break;

            case "task:created":
            case "task:moved":
            case "tasks:reordered":
              callbacksRef.current.onTaskChange?.();
              break;

            case "task:updated":
              callbacksRef.current.onTaskChange?.();
              callbacksRef.current.onTaskUpdate?.(payload.data);
              break;

            case "task:deleted":
              callbacksRef.current.onTaskChange?.();
              callbacksRef.current.onTaskDelete?.(payload.data?.taskId || payload.data?.id || payload.data);
              break;

            case "activity:new":
              callbacksRef.current.onActivityChange?.(payload.data);
              break;

            case "member:joined":
            case "member:removed":
            case "member:role_updated":
              callbacksRef.current.onMemberChange?.();
              break;

            case "board:updated":
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
  }, [boardId, userId]);

  return { isConnected };
}
