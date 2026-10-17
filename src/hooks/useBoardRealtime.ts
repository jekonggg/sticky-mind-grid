import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  onCommentChange?: (data?: any) => void;
  onNoteChange?: (data?: any) => void;
  onTrashEmptied?: (data?: any) => void;
}

const activeConnectedBoards = new Set<string>();

/**
 * Returns true if a real-time SSE stream is actively connected for the given board.
 * Used by useTasks and useActivity to suppress redundant HTTP polling while SSE is healthy.
 */
export function isBoardRealtimeConnected(boardId?: string | null): boolean {
  return Boolean(boardId && activeConnectedBoards.has(boardId));
}

export function clearBoardRealtimeStatus(boardId?: string | null): void {
  if (boardId) {
    activeConnectedBoards.delete(boardId);
  } else {
    activeConnectedBoards.clear();
  }
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
  onCommentChange,
  onNoteChange,
  onTrashEmptied,
}: UseBoardRealtimeOptions) {
  const { user, token: authToken } = useAuth();
  const { devSettings } = useDevMode();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const setConnected = useCallback(
    (connected: boolean) => {
      setIsConnected(connected);
      if (boardId) {
        if (connected) {
          activeConnectedBoards.add(boardId);
        } else {
          activeConnectedBoards.delete(boardId);
        }
      }
    },
    [boardId]
  );

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasConnectedOnceRef = useRef(false);
  const needsReconnectSyncRef = useRef(false);
  const RECONNECT_LOCK_DEBOUNCE_MS = 4000;

  const clearReconnectDebounce = () => {
    if (reconnectDebounceTimeoutRef.current) {
      clearTimeout(reconnectDebounceTimeoutRef.current);
      reconnectDebounceTimeoutRef.current = null;
    }
  };

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
    onCommentChange,
    onNoteChange,
    onTrashEmptied,
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
      onCommentChange,
      onNoteChange,
      onTrashEmptied,
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
      clearReconnectDebounce();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      setIsReconnecting(true);
      needsReconnectSyncRef.current = true;
      return;
    }

    // In Seed Sandbox Mode (e.g. Full System Showcase), mock boards do not exist on the backend SSE server.
    // Simulate active connection without triggering reconnect loops or read-only locks.
    if (devSettings.seedTakeoverPreset && devSettings.seedTakeoverPreset !== "none") {
      clearReconnectDebounce();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(true);
      setIsReconnecting(false);
      return;
    }

    if (!boardId || !userId) {
      clearReconnectDebounce();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
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
        clearReconnectDebounce();
        setConnected(true);
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

          /**
           * Backend SSE Event Catalog (All 21+ Backend Events):
           * 1.  `connected`: Connection acknowledged by backend stream -> handled (sets isConnected, triggers onReconnect).
           * 2.  `task:created`: Task created in column -> handled (onTaskChange).
           * 3.  `task:updated`: Task modified -> handled (onTaskChange, onTaskUpdate).
           * 4.  `task:moved`: Task moved between columns -> handled (onTaskMoved, onTaskChange).
           * 5.  `tasks:reordered`: Batch positions updated -> handled (onTasksReordered, onTaskChange).
           * 6.  `task:deleted`: Task soft- or hard-deleted -> handled (onTaskChange, onTaskDelete, invalidates trashTasks).
           * 7.  `activity:new`: Activity logged -> handled (onActivityChange).
           * 8.  `member:invited`: Invitation sent -> handled (invalidates boardMembers & pendingInvitations, onMemberChange).
           * 9.  `member:invite_resent`: Invite reminder resent -> handled (invalidates boardMembers & pendingInvitations, onMemberChange).
           * 10. `member:joined`: User joined board -> handled (invalidates boardMembers, onMemberChange).
           * 11. `member:role_updated`: Member role changed -> handled (invalidates boardMembers, onMemberChange).
           * 12. `member:removed`: Member revoked/removed -> handled (invalidates boardMembers, disconnects if self, onMemberChange).
           * 13. `force_disconnect`: Disconnection forced by server -> handled (closes EventSource, onForceDisconnect).
           * 14. `board:updated`: Board metadata/columns modified -> handled (invalidates boards/board, onBoardChange).
           * 15. `board:deleted`: Board deleted -> handled (onBoardDeleted).
           * 16. `comment:created`: Comment created -> handled (invalidates taskComments, onCommentChange).
           * 17. `comment:updated`: Comment edited -> handled (invalidates taskComments, onCommentChange).
           * 18. `comment:deleted`: Comment deleted -> handled (invalidates taskComments, onCommentChange).
           * 19. `note:created`: Board note created -> handled (invalidates boardNotes/notes, onNoteChange).
           * 20. `note:updated`: Board note edited -> handled (invalidates boardNotes/notes, onNoteChange).
           * 21. `note:deleted`: Board note deleted -> handled (invalidates boardNotes/notes, onNoteChange).
           * 22. `trash:emptied`: Trash emptied -> handled (invalidates trashTasks, onTrashEmptied).
           */
          switch (payload.type) {
            case "connected":
              if (isMounted) {
                clearReconnectDebounce();
                setConnected(true);
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
              queryClient?.invalidateQueries({ queryKey: ["trashTasks", boardId] });
              callbacksRef.current.onTaskChange?.(payload.data);
              callbacksRef.current.onTaskDelete?.(payload.data?.taskId || payload.data?.id || payload.data);
              break;

            case "activity:new":
              callbacksRef.current.onActivityChange?.(payload.data);
              break;

            case "member:invited":
            case "member:invite_resent":
              queryClient?.invalidateQueries({ queryKey: ["boardMembers", boardId] });
              queryClient?.invalidateQueries({ queryKey: ["pendingInvitations"] });
              callbacksRef.current.onMemberChange?.({
                ...(payload.data && typeof payload.data === "object" ? payload.data : {}),
                eventType: payload.type,
              });
              break;

            case "member:joined":
            case "member:role_updated":
              queryClient?.invalidateQueries({ queryKey: ["boardMembers", boardId] });
              callbacksRef.current.onMemberChange?.({
                ...(payload.data && typeof payload.data === "object" ? payload.data : {}),
                eventType: payload.type,
              });
              break;

            case "member:removed":
              queryClient?.invalidateQueries({ queryKey: ["boardMembers", boardId] });
              if (payload.data?.userId && String(payload.data.userId) === String(userId)) {
                clearReconnectDebounce();
                if (reconnectTimeoutRef.current) {
                  clearTimeout(reconnectTimeoutRef.current);
                  reconnectTimeoutRef.current = null;
                }
                es.close();
                if (eventSourceRef.current === es) {
                  eventSourceRef.current = null;
                }
                if (isMounted) {
                  setConnected(false);
                  setIsReconnecting(false);
                }
              }
              callbacksRef.current.onMemberChange?.({
                ...(payload.data && typeof payload.data === "object" ? payload.data : {}),
                eventType: payload.type,
              });
              break;

            case "force_disconnect":
              clearReconnectDebounce();
              if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
              }
              es.close();
              if (eventSourceRef.current === es) {
                eventSourceRef.current = null;
              }
              if (isMounted) {
                setConnected(false);
                setIsReconnecting(false);
              }
              callbacksRef.current.onForceDisconnect?.(payload.data);
              break;

            case "board:updated":
              queryClient?.invalidateQueries({ queryKey: ["boards"] });
              queryClient?.invalidateQueries({ queryKey: ["board", boardId] });
              callbacksRef.current.onBoardChange?.(payload.data);
              break;

            case "board:deleted":
              callbacksRef.current.onBoardDeleted?.(payload.data);
              break;

            case "comment:created":
            case "comment:updated":
            case "comment:deleted": {
              const taskId = payload.data?.taskId || payload.data?.task_id;
              if (taskId) {
                queryClient?.invalidateQueries({ queryKey: ["taskComments", taskId] });
              }
              queryClient?.invalidateQueries({ queryKey: ["taskComments"] });
              callbacksRef.current.onCommentChange?.(payload.data);
              break;
            }

            case "note:created":
            case "note:updated":
            case "note:deleted":
              queryClient?.invalidateQueries({ queryKey: ["boardNotes", boardId] });
              queryClient?.invalidateQueries({ queryKey: ["notes", boardId] });
              callbacksRef.current.onNoteChange?.(payload.data);
              break;

            case "trash:emptied":
              queryClient?.invalidateQueries({ queryKey: ["trashTasks", boardId] });
              callbacksRef.current.onTrashEmptied?.(payload.data);
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
          setConnected(false);
          // Debounce the read-only reconnect lock (OQ-10) to prevent jarring UI locks during brief disconnects
          if (!reconnectDebounceTimeoutRef.current) {
            reconnectDebounceTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                setIsReconnecting(true);
              }
              reconnectDebounceTimeoutRef.current = null;
            }, RECONNECT_LOCK_DEBOUNCE_MS);
          }
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
      setConnected(false);
      if (!reconnectDebounceTimeoutRef.current) {
        reconnectDebounceTimeoutRef.current = setTimeout(() => {
          if (isMounted) {
            setIsReconnecting(true);
          }
          reconnectDebounceTimeoutRef.current = null;
        }, RECONNECT_LOCK_DEBOUNCE_MS);
      }
      needsReconnectSyncRef.current = true;
    };

    const handleOnline = () => {
      if (!isMounted) return;
      clearReconnectDebounce();
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
      clearReconnectDebounce();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      setIsReconnecting(false);
    };
  }, [boardId, userId, authToken, devSettings.simulateSseDisconnect, devSettings.seedTakeoverPreset, queryClient]);

  return { isConnected, isReconnecting };
}
