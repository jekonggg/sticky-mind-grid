import { useState, useEffect, useCallback, useMemo } from "react";
import { Board, CreateBoardData, UpdateBoardData } from "@/types/board";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";

export type SortOption = "updated" | "name" | "created";

export function useBoards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");

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
      toast.success(`Board "${board.name}" created`);
      return board;
    } catch {
      toast.error("Failed to create board");
    }
  }, []);

  const updateBoard = useCallback(async (id: string, data: UpdateBoardData) => {
    try {
      const board = await boardApi.updateBoard(id, data);
      setBoards((prev) => prev.map((b) => (b.id === id ? board : b)));
      toast.success(`Board "${board.name}" updated`);
      return board;
    } catch {
      toast.error("Failed to update board");
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    const board = boards.find((b) => b.id === id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
    toast.success(`Board "${board?.name}" deleted`);
    try {
      await boardApi.deleteBoard(id);
    } catch {
      fetchBoards();
    }
  }, [boards, fetchBoards]);

  const filteredBoards = useMemo(() => {
    let result = boards;
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
  }, [boards, search, sort]);

  return {
    boards: filteredBoards,
    loading,
    search,
    setSearch,
    sort,
    setSort,
    createBoard,
    updateBoard,
    deleteBoard,
  };
}
