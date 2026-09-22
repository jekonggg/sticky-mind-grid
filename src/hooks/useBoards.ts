import { useState, useEffect, useCallback, useMemo } from "react";
import { Board, CreateBoardData, UpdateBoardData } from "@/types/board";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { useActivity } from "./useActivity";
import { useAuth } from "@/contexts/AuthContext";

export type SortOption = "updated" | "name" | "created";
export type BoardFilterOption = "all" | "owned" | "shared";

export function isBoardOwnedByUser(board: Board, userId?: string): boolean {
  if (board.role) {
    return board.role === "owner";
  }
  return Boolean(userId && board.ownerId && String(board.ownerId) === String(userId));
}

export function useBoards() {
  const { user } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");
  const [filter, setFilter] = useState<BoardFilterOption>("all");
  const { addActivity } = useActivity();

  const fetchBoards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await boardApi.getBoards();
      setBoards(data);
    } catch {
      toast.error("Failed to load boards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const createBoard = useCallback(async (data: CreateBoardData) => {
    try {
      const board = await boardApi.createBoard(data);
      setBoards((prev) => [...prev, board]);
      addActivity("create", board.name, `New board "${board.name}" created`);
      toast.success(`Board "${board.name}" created`);
      return board;
    } catch {
      toast.error("Failed to create board");
    }
  }, [addActivity]);

  const updateBoard = useCallback(async (id: string, data: UpdateBoardData) => {
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
  }, [addActivity]);

  const deleteBoard = useCallback(async (id: string) => {
    const board = boards.find((b) => b.id === id);
    if (!board) return;
    
    setBoards((prev) => prev.filter((b) => b.id !== id));
    addActivity("delete", board.name, `Board "${board.name}" permanently deleted`);
    toast.success(`Board "${board.name}" deleted`);
    
    try {
      await boardApi.deleteBoard(id);
    } catch {
      fetchBoards();
    }
  }, [boards, fetchBoards, addActivity]);

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
    loading,
    search,
    setSearch,
    sort,
    setSort,
    filter,
    setFilter,
    createBoard,
    updateBoard,
    deleteBoard,
  };
}
