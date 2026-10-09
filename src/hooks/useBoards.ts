import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Board, CreateBoardData, UpdateBoardData } from "@/types/board";
import { boardApi } from "@/services/boardApi";
import { toast } from "sonner";
import { useActivity } from "./useActivity";
import { queryKeys } from "@/config/queryKeys";

export type SortOption = "updated" | "name" | "created";

export function useBoards() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("updated");
  const { addActivity } = useActivity();

  const { data: boards = [], isLoading: loading, refetch: fetchBoards } = useQuery<Board[]>({
    queryKey: queryKeys.boards.all,
    queryFn: () => boardApi.getBoards(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBoardData) => boardApi.createBoard(data),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      addActivity("create", board.name, `New board "${board.name}" created`);
      toast.success(`Board "${board.name}" created`);
    },
    onError: () => {
      toast.error("Failed to create board");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBoardData }) =>
      boardApi.updateBoard(id, data),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      addActivity("update", board.name, `Board settings updated for "${board.name}"`);
      toast.success(`Board "${board.name}" updated`);
    },
    onError: () => {
      toast.error("Failed to update board");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => boardApi.deleteBoard(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      const board = boards.find((b) => b.id === id);
      const name = board?.name || "Board";
      addActivity("delete", name, `Board "${name}" permanently deleted`);
      toast.success(`Board "${name}" deleted`);
    },
    onError: () => {
      toast.error("Failed to delete board");
    },
  });

  const createBoard = async (data: CreateBoardData) => {
    return await createMutation.mutateAsync(data);
  };

  const updateBoard = async (id: string, data: UpdateBoardData) => {
    return await updateMutation.mutateAsync({ id, data });
  };

  const deleteBoard = async (id: string) => {
    return await deleteMutation.mutateAsync(id);
  };

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
    fetchBoards,
  };
}
