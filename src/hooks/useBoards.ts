import { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { QueryClientContext, QueryClient } from "@tanstack/react-query";
import { Board, CreateBoardData, UpdateBoardData } from "@/types/board";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { useActivity } from "./useActivity";
import { useAuth } from "@/contexts/AuthContext";
import { unpinBoardId } from "@/utils/pinnedBoardsUtils";

export type SortOption = "updated" | "name" | "created";
export type BoardFilterOption = "all" | "owned" | "shared";
export type BoardViewOption = "grid" | "compact";

export interface BoardUserPrefs {
  sort: SortOption;
  filter: BoardFilterOption;
  view: BoardViewOption;
}

const DEFAULT_PREFS: BoardUserPrefs = {
  sort: "updated",
  filter: "all",
  view: "grid",
};

export function getBoardPrefsKey(userId?: string): string {
  return `sticky_mind_grid_board_prefs_${userId || "guest"}`;
}

export function loadBoardPrefs(userId?: string): BoardUserPrefs {
  try {
    const raw = localStorage.getItem(getBoardPrefsKey(userId));
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      sort:
        parsed.sort === "name" || parsed.sort === "created" || parsed.sort === "updated"
          ? parsed.sort
          : "updated",
      filter:
        parsed.filter === "owned" || parsed.filter === "shared" || parsed.filter === "all"
          ? parsed.filter
          : "all",
      view: parsed.view === "compact" || parsed.view === "grid" ? parsed.view : "grid",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveBoardPrefs(userId: string | undefined, patch: Partial<BoardUserPrefs>): void {
  try {
    const current = loadBoardPrefs(userId);
    const updated: BoardUserPrefs = { ...current, ...patch };
    localStorage.setItem(getBoardPrefsKey(userId), JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}

export function isBoardOwnedByUser(board: Board, userId?: string): boolean {
  if (board.role) {
    return board.role === "owner";
  }
  return Boolean(userId && board.ownerId && String(board.ownerId) === String(userId));
}

// Module-level in-memory cache for boards (persists across route navigations)
let cachedBoards: Board[] | null = null;
let cachedTrashedBoards: Board[] = [];
let cachedUserId: string | undefined = undefined;
let lastBoardsFetchTime = 0;
let inFlightBoardsPromise: Promise<Board[]> | null = null;
let hasFetchedTrashForUser: string | undefined = undefined;
let lastQueryClient: QueryClient | undefined = undefined;
export const BOARDS_CACHE_TTL_MS = 60_000;

export function clearBoardsCache() {
  cachedBoards = null;
  cachedTrashedBoards = [];
  cachedUserId = undefined;
  lastBoardsFetchTime = 0;
  inFlightBoardsPromise = null;
  hasFetchedTrashForUser = undefined;
  lastQueryClient?.removeQueries({ queryKey: ["boards"] });
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:session-expired", clearBoardsCache);
}

export function useBoards() {
  const { user } = useAuth();
  const queryClient = useContext(QueryClientContext);
  lastQueryClient = queryClient;

  // Invalidate cache if authenticated user changed
  if (cachedUserId !== user?.id) {
    if (cachedUserId !== undefined) {
      queryClient?.removeQueries({ queryKey: ["boards"] });
    }
    cachedBoards = null;
    cachedTrashedBoards = [];
    cachedUserId = user?.id;
    lastBoardsFetchTime = 0;
    inFlightBoardsPromise = null;
    hasFetchedTrashForUser = undefined;
  }

  if (cachedBoards === null && queryClient) {
    const rqBoards = queryClient.getQueryData<Board[]>(["boards"]);
    if (rqBoards) {
      cachedBoards = rqBoards;
      cachedUserId = user?.id;
      lastBoardsFetchTime = Date.now();
    }
  }

  const hasCachedData = cachedBoards !== null;
  const [boards, setBoards] = useState<Board[]>(() => cachedBoards || []);
  const [trashedBoards, setTrashedBoards] = useState<Board[]>(() => cachedTrashedBoards || []);
  const [loading, setLoading] = useState<boolean>(() => !hasCachedData);
  const [search, setSearch] = useState("");
  const [sort, setSortState] = useState<SortOption>(() => loadBoardPrefs(user?.id).sort);
  const [filter, setFilterState] = useState<BoardFilterOption>(() => loadBoardPrefs(user?.id).filter);
  const [view, setViewState] = useState<BoardViewOption>(() => loadBoardPrefs(user?.id).view);
  const { addActivity } = useActivity();
  const hasLoadedRef = useRef(hasCachedData);
  const loadedUserIdRef = useRef<string | undefined>(user?.id);

  // Sync preferences when user?.id changes or on mount
  useEffect(() => {
    if (loadedUserIdRef.current !== user?.id) {
      loadedUserIdRef.current = user?.id;
      const prefs = loadBoardPrefs(user?.id);
      setSortState(prefs.sort);
      setFilterState(prefs.filter);
      setViewState(prefs.view);
      return;
    }
    saveBoardPrefs(user?.id, { sort, filter, view });
  }, [user?.id, sort, filter, view]);

  const setSort = useCallback(
    (nextSort: SortOption) => {
      setSortState(nextSort);
      saveBoardPrefs(user?.id, { sort: nextSort });
    },
    [user?.id]
  );

  const setFilter = useCallback(
    (nextFilter: BoardFilterOption) => {
      setFilterState(nextFilter);
      saveBoardPrefs(user?.id, { filter: nextFilter });
    },
    [user?.id]
  );

  const setView = useCallback(
    (nextView: BoardViewOption) => {
      setViewState(nextView);
      saveBoardPrefs(user?.id, { view: nextView });
    },
    [user?.id]
  );

  const fetchBoards = useCallback(
    async (options?: { silent?: boolean; includeTrash?: boolean }) => {
      const isSilent = options?.silent ?? (hasLoadedRef.current || cachedBoards !== null);
      try {
        if (!isSilent) {
          setLoading(true);
        }
        if (!inFlightBoardsPromise) {
          const promise = queryClient
            ? queryClient.fetchQuery({
                queryKey: ["boards"],
                queryFn: () => boardApi.getBoards(),
                staleTime: 1000,
              })
            : boardApi.getBoards();
          inFlightBoardsPromise = promise.finally(() => {
            if (inFlightBoardsPromise === promise) {
              inFlightBoardsPromise = null;
            }
          });
        }
        const data = await inFlightBoardsPromise;
        const validData = Array.isArray(data)
          ? data.filter((b) => !b.isDeleted && !cachedTrashedBoards.some((t) => t.id === b.id))
          : [];
        setBoards(validData);
        cachedBoards = validData;
        cachedUserId = user?.id;
        lastBoardsFetchTime = Date.now();
        queryClient?.setQueryData(["boards"], validData);

        const userKey = user?.id || "guest";
        const shouldFetchTrash =
          options?.includeTrash === true ||
          (options?.includeTrash !== false && hasFetchedTrashForUser !== userKey);

        if (shouldFetchTrash && typeof boardApi.getTrashedBoards === "function") {
          hasFetchedTrashForUser = userKey;
          boardApi
            .getTrashedBoards()
            .then((trashed) => {
              if (Array.isArray(trashed)) {
                setTrashedBoards(trashed);
                cachedTrashedBoards = trashed;
              }
            })
            .catch(() => {
              // Silently ignore if endpoint not mocked or unavailable
            });
        }
      } catch {
        if (!isSilent) {
          toast.error("Failed to load boards");
        }
      } finally {
        hasLoadedRef.current = true;
        if (!isSilent) {
          setLoading(false);
        }
      }
    },
    [user?.id, queryClient]
  );

  useEffect(() => {
    const isFresh =
      cachedBoards !== null &&
      cachedUserId === user?.id &&
      Date.now() - lastBoardsFetchTime < BOARDS_CACHE_TTL_MS;

    if (!isFresh) {
      fetchBoards({ silent: cachedBoards !== null });
    }

    const handleDataModeChange = () => {
      clearBoardsCache();
      fetchBoards({ silent: false });
    };
    const handleFocus = () => {
      if (Date.now() - lastBoardsFetchTime >= BOARDS_CACHE_TTL_MS) {
        fetchBoards({ silent: true });
      }
    };
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastBoardsFetchTime >= BOARDS_CACHE_TTL_MS
      ) {
        fetchBoards({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchBoards({ silent: true, includeTrash: false });
      }
    }, 30000);

    window.addEventListener("smg-dev-data-mode-changed", handleDataModeChange);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("smg-dev-data-mode-changed", handleDataModeChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchBoards, user?.id]);

  const createBoard = useCallback(
    async (data: CreateBoardData) => {
      try {
        const board = await boardApi.createBoard(data);
        setBoards((prev) => {
          const next = [...prev, board];
          cachedBoards = next;
          queryClient?.setQueryData(["boards"], next);
          return next;
        });
        addActivity("create", board.name, `New board "${board.name}" created`);
        toast.success(`Board "${board.name}" created`);
        return board;
      } catch {
        toast.error("Failed to create board");
      }
    },
    [addActivity, queryClient]
  );

  const updateBoard = useCallback(
    async (id: string, data: UpdateBoardData) => {
      try {
        const board = await boardApi.updateBoard(id, data);
        setBoards((prev) => {
          const next = prev.map((b) => (b.id === id ? board : b));
          cachedBoards = next;
          queryClient?.setQueryData(["boards"], next);
          return next;
        });
        addActivity("update", board.name, `Board settings updated for "${board.name}"`);
        toast.success(`Board "${board.name}" updated`);
        return board;
      } catch (err: any) {
        toast.error(err?.message || "Failed to update board");
        throw err;
      }
    },
    [addActivity, queryClient]
  );

  const restoreBoard = useCallback(
    async (id: string) => {
      const trashed = trashedBoards.find((b) => b.id === id);
      if (trashed) {
        const restoredLocal: Board = { ...trashed, isDeleted: false, deletedAt: null };
        setTrashedBoards((prev) => {
          const next = prev.filter((b) => b.id !== id);
          cachedTrashedBoards = next;
          return next;
        });
        setBoards((prev) => {
          const next = [restoredLocal, ...prev.filter((b) => b.id !== id)];
          cachedBoards = next;
          queryClient?.setQueryData(["boards"], next);
          return next;
        });
      }

      try {
        if (typeof boardApi.restoreBoard === "function") {
          const restored = await boardApi.restoreBoard(id);
          if (restored) {
            setBoards((prev) => {
              const next = [restored, ...prev.filter((b) => b.id !== id)];
              cachedBoards = next;
              queryClient?.setQueryData(["boards"], next);
              return next;
            });
          }
        }
        addActivity("update", trashed?.name || "Board", `Board "${trashed?.name || "Board"}" restored`);
        toast.success(`Board "${trashed?.name || "Board"}" restored`);
      } catch {
        toast.error("Failed to restore board");
        fetchBoards({ silent: true, includeTrash: true });
      }
    },
    [trashedBoards, addActivity, fetchBoards, queryClient]
  );

  const softDeleteBoard = useCallback(
    async (id: string) => {
      const board = boards.find((b) => b.id === id);
      if (!board) return;

      // Cancel in-flight queries and unpin immediately
      inFlightBoardsPromise = null;
      void queryClient?.cancelQueries({ queryKey: ["boards"] });
      unpinBoardId(id, user?.id);

      const trashedEntry: Board = {
        ...board,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      };

      setBoards((prev) => {
        const next = prev.filter((b) => b.id !== id);
        cachedBoards = next;
        queryClient?.setQueryData(["boards"], next);
        return next;
      });
      setTrashedBoards((prev) => {
        const next = [trashedEntry, ...prev.filter((b) => b.id !== id)];
        cachedTrashedBoards = next;
        return next;
      });
      addActivity("delete", board.name, `Board "${board.name}" moved to Recently Deleted`);
      toast.success(`Board "${board.name}" moved to Recently Deleted (30-day grace period)`, {
        action: {
          label: "Restore",
          onClick: () => {
            void restoreBoard(id);
          },
        },
      });

      try {
        await boardApi.deleteBoard(id, { soft: true });
      } catch {
        fetchBoards({ silent: true, includeTrash: true });
      }
    },
    [boards, fetchBoards, addActivity, restoreBoard, queryClient, user?.id]
  );

  const permanentlyDeleteBoard = useCallback(
    async (id: string, confirmName?: string) => {
      const target = trashedBoards.find((b) => b.id === id) || boards.find((b) => b.id === id);
      const nameToConfirm = confirmName || target?.name;

      // Cancel in-flight queries and unpin immediately
      inFlightBoardsPromise = null;
      void queryClient?.cancelQueries({ queryKey: ["boards"] });
      unpinBoardId(id, user?.id);

      setTrashedBoards((prev) => {
        const next = prev.filter((b) => b.id !== id);
        cachedTrashedBoards = next;
        return next;
      });
      setBoards((prev) => {
        const next = prev.filter((b) => b.id !== id);
        cachedBoards = next;
        queryClient?.setQueryData(["boards"], next);
        return next;
      });
      if (target) {
        addActivity("delete", target.name, `Board "${target.name}" permanently deleted`);
        toast.success(`Board "${target.name}" permanently deleted`);
      }

      try {
        await boardApi.deleteBoard(id, { confirmName: nameToConfirm });
      } catch (err: any) {
        toast.error(err.message || "Failed to permanently delete board");
        fetchBoards({ silent: true, includeTrash: true });
      }
    },
    [trashedBoards, boards, addActivity, fetchBoards, queryClient, user?.id]
  );

  const deleteBoard = useCallback(
    async (id: string) => {
      await softDeleteBoard(id);
    },
    [softDeleteBoard]
  );

  const filteredBoards = useMemo(() => {
    let result = boards.filter((b) => !b.isDeleted);
    if (filter === "owned") {
      result = result.filter((b) => isBoardOwnedByUser(b, user?.id));
    } else if (filter === "shared") {
      result = result.filter((b) => !isBoardOwnedByUser(b, user?.id));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "updated":
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });
    return result;
  }, [boards, filter, search, sort, user?.id]);

  return {
    boards: filteredBoards,
    allBoards: boards,
    trashedBoards,
    loading,
    search,
    setSearch,
    sort,
    setSort,
    filter,
    setFilter,
    view,
    setView,
    createBoard,
    updateBoard,
    deleteBoard,
    softDeleteBoard,
    restoreBoard,
    permanentlyDeleteBoard,
    refreshBoards: fetchBoards,
  };
}

