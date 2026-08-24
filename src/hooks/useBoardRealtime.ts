import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface RealtimeEvent {
  type: string;
  boardId: string;
  data: any;
  timestamp: string;
}

interface UseBoardRealtimeOptions {
  boardId?: string | null;
  onTaskChange?: () => void;
  onActivityChange?: (activity: any) => void;
  onMemberChange?: () => void;
  onBoardChange?: (board: any) => void;
}

const API_BASE = "http://127.0.0.1:5000/api";

export function useBoardRealtime({
  boardId,
  onTaskChange,
  onActivityChange,
  onMemberChange,
  onBoardChange,
}: UseBoardRealtimeOptions) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!boardId || !user) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    // Close any previous stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${API_BASE}/boards/${boardId}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (e) => {
      try {
        const payload: RealtimeEvent = JSON.parse(e.data);
        if (!payload || !payload.type) return;

        switch (payload.type) {
          case "connected":
            setIsConnected(true);
            break;

          case "task:created":
          case "task:updated":
          case "task:moved":
          case "task:deleted":
          case "tasks:reordered":
            onTaskChange?.();
            break;

          case "activity:new":
            onActivityChange?.(payload.data);
            break;

          case "member:joined":
          case "member:removed":
          case "member:role_updated":
            onMemberChange?.();
            break;

          case "board:updated":
            onBoardChange?.(payload.data);
            break;

          default:
            break;
        }
      } catch (err) {
        // Ignore unparseable or ping frames
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();

      // Attempt reconnect after 3 seconds
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (boardId) connect();
      }, 3000);
    };
  }, [boardId, user, onTaskChange, onActivityChange, onMemberChange, onBoardChange]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return { isConnected };
}
