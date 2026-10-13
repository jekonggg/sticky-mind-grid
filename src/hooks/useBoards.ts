import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Board, CreateBoardData, UpdateBoardData } from "@/types/board";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { useActivity } from "./useActivity";
import { useAuth } from "@/contexts/AuthContext";

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

export function useBoards() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [trashedBoards, setTrashedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSortState] = useState<SortOption>(() => loadBoardPrefs(user?.id).sort);
  const [filter, setFilterState] = useState<BoardFilterOption>(() => loadBoardPrefs(user?.id).filter);
  const [view, setViewState] = useState<BoardViewOption>(() => loadBoardPrefs(user?.id).view);
  const { addActivity } = useActivity();
  const hasLoadedRef = useRef(false);
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

  const fetchBoards = useCallback(async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? hasLoadedRef.current;
    try {
      if (!isSilent) {
        setLoading(true);
      }
      const data = await boardApi.getBoards();
      setBoards(data);
      if (typeof boardApi.getTrashedBoards === "function") {
        boardApi
          .getTrashedBoards()
          .then((trashed) => {
            if (Array.isArray(trashed)) {
              setTrashedBoards(trashed);
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
  }, []);

  useEffect(() => {
    fetchBoards({ silent: false });

    const handleDataModeChange = () => {
      fetchBoards({ silent: false });
    };
    const handleFocus = () => {
      fetchBoards({ silent: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchBoards({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchBoards({ silent: true });
      }
    }, 8000);

    window.addEventListener("smg-dev-data-mode-changed", handleDataModeChange);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("smg-dev-data-mode-changed", handleDataModeChange);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchBoards]);

  const createBoard = useCallback(
    async (data: CreateBoardData) => {
      try {
        const board = await boardApi.createBoard(data);
        setBoards((prev) => [...prev, board]);
        addActivity("create", board.name, `New board "${board.name}" created`);
        toast.success(`Board "${board.name}" created`);
        return board;
      } catch {
        toast.error("Failed to create board");
      }
    },
    [addActivity]
  );

  const updateBoard = useCallback(
    async (id: string, data: UpdateBoardData) => {
      try {
        const board = await boardApi.updateBoard(id, data);
        setBoards((prev) => prev.map((b) => (b.id === id ? board : b)));
        addActivity("update", board.name, `Board settings updated for "${board.name}"`);
        toast.success(`Board "${board.name}" updated`);
        return board;
      } catch (err: any) {
        toast.error(err?.message || "Failed to update board");
        throw err;
      }
    },
    [addActivity]
  );

  const restoreBoard = useCallback(
    async (id: string) => {
      const trashed = trashedBoards.find((b) => b.id === id);
      if (trashed) {
        const restoredLocal: Board = { ...trashed, isDeleted: false, deletedAt: null };
        setTrashedBoards((prev) => prev.filter((b) => b.id !== id));
        setBoards((prev) => [restoredLocal, ...prev.filter((b) => b.id !== id)]);
      }

      try {
        if (typeof boardApi.restoreBoard === "function") {
          const restored = await boardApi.restoreBoard(id);
          if (restored) {
            setBoards((prev) => [restored, ...prev.filter((b) => b.id !== id)]);
          }
        }
        addActivity("update", trashed?.name || "Board", `Board "${trashed?.name || "Board"}" restored`);
        toast.success(`Board "${trashed?.name || "Board"}" restored`);
      } catch {
        toast.error("Failed to restore board");
        fetchBoards({ silent: true });
      }
    },
    [trashedBoards, addActivity, fetchBoards]
  );

  const softDeleteBoard = useCallback(
    async (id: string) => {
      const board = boards.find((b) => b.id === id);
      if (!board) return;

      const trashedEntry: Board = {
        ...board,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
      };

      setBoards((prev) => prev.filter((b) => b.id !== id));
      setTrashedBoards((prev) => [trashedEntry, ...prev.filter((b) => b.id !== id)]);
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
        fetchBoards({ silent: true });
      }
    },
    [boards, fetchBoards, addActivity, restoreBoard]
  );

  const permanentlyDeleteBoard = useCallback(
    async (id: string, confirmName?: string) => {
      const target = trashedBoards.find((b) => b.id === id) || boards.find((b) => b.id === id);
      const nameToConfirm = confirmName || target?.name;
      setTrashedBoards((prev) => prev.filter((b) => b.id !== id));
      setBoards((prev) => prev.filter((b) => b.id !== id));
      if (target) {
        addActivity("delete", target.name, `Board "${target.name}" permanently deleted`);
        toast.success(`Board "${target.name}" permanently deleted`);
      }

      try {
        await boardApi.deleteBoard(id, { confirmName: nameToConfirm });
      } catch (err: any) {
        toast.error(err.message || "Failed to permanently delete board");
        fetchBoards({ silent: true });
      }
    },
    [trashedBoards, boards, addActivity, fetchBoards]
  );

  const deleteBoard = useCallback(
    async (id: string) => {
      await softDeleteBoard(id);
    },
    [softDeleteBoard]
  );

  const filteredBoards = useMemo(() => {
    let result = boards;
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

