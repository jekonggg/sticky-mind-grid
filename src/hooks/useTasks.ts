import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Task, CreateTaskData, UpdateTaskData, TaskStatus, Column } from "@/types/task";
import { taskApi } from "@/services/api";
import { useActivity } from "./useActivity";
import { queryKeys } from "@/config/queryKeys";

export function useTasks(boardId: string, initialColumns: Column[] = []) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const { addActivity } = useActivity();

  // Sync columns when board updates
  useEffect(() => {
    if (initialColumns && initialColumns.length > 0) {
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  // Primary task query for this board
  const {
    data: serverTasks = [],
    isLoading: loading,
  } = useQuery<Task[]>({
    queryKey: queryKeys.tasks.board(boardId),
    queryFn: () => (boardId ? taskApi.getTasks(boardId) : Promise.resolve([])),
    enabled: !!boardId,
    // Slow fallback interval only (45s) — real-time SSE handles primary synchronization
    refetchInterval: 45000,
    refetchIntervalInBackground: false,
  });

  // Local state for optimistic mutations
  const [tasks, setTasks] = useState<Task[]>([]);

  // Sync server tasks to local state when query cache updates
  useEffect(() => {
    setTasks(serverTasks);
  }, [serverTasks]);

  const fetchTasks = useCallback(async () => {
    if (!boardId) return;
    await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.board(boardId) });
  }, [boardId, queryClient]);

  const addTask = useCallback(
    async (data: CreateTaskData) => {
      const task = await taskApi.createTask({ ...data, boardId });
      setTasks((prev) => [...prev, task]);
      queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), (old = []) => [...old, task]);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      addActivity("create", task.title, `Created task "${task.title}"`, boardId);
      return task;
    },
    [addActivity, boardId, queryClient]
  );

  const updateTask = useCallback(
    async (id: string, data: UpdateTaskData) => {
      const previousTasks = tasks;
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      // Optimistic local and cache update
      const updatedList = tasks.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date() } : t
      );
      setTasks(updatedList);
      queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), updatedList);

      try {
        const updated = await taskApi.updateTask(id, data);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), (prev = []) =>
          prev.map((t) => (t.id === id ? updated : t))
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
        queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      } catch {
        setTasks(previousTasks);
        queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), previousTasks);
        fetchTasks();
      }
    },
    [boardId, fetchTasks, queryClient, tasks]
  );

  const reorderTasks = useCallback(
    async (items: Array<{ id: string; status?: string; position: number }>) => {
      if (!boardId || items.length === 0) return;
      const previousTasks = tasks;

      // Optimistic local reorder
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const updated = tasks.map((t) => {
        const match = itemMap.get(t.id);
        if (match) {
          return {
            ...t,
            status: (match.status as TaskStatus) || t.status,
            position: match.position,
          };
        }
        return t;
      });
      const sorted = updated.sort((a, b) => (a.position || 0) - (b.position || 0));
      setTasks(sorted);
      queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), sorted);

      try {
        const updatedList = await taskApi.reorderTasks(boardId, items);
        if (updatedList && updatedList.length > 0) {
          const updatedMap = new Map(updatedList.map((t) => [t.id, t]));
          const next = sorted.map((t) => updatedMap.get(t.id) || t);
          setTasks(next);
          queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), next);
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
      } catch {
        setTasks(previousTasks);
        queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), previousTasks);
        fetchTasks();
      }
    },
    [boardId, fetchTasks, queryClient, tasks]
  );

  const moveTask = useCallback(
    async (id: string, status: TaskStatus) => {
      const task = tasks.find((t) => t.id === id);
      if (!task || task.status === status) return;
      const previousTasks = tasks;

      const updated = tasks.map((t) =>
        t.id === id ? { ...t, status, updatedAt: new Date() } : t
      );
      setTasks(updated);
      queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), updated);

      try {
        await taskApi.updateTask(id, { status });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
      } catch {
        setTasks(previousTasks);
        queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), previousTasks);
        fetchTasks();
      }
    },
    [boardId, fetchTasks, queryClient, tasks]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const previousTasks = tasks;

      const filtered = tasks.filter((t) => t.id !== id);
      setTasks(filtered);
      queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), filtered);

      try {
        await taskApi.deleteTask(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.global() });
        queryClient.invalidateQueries({ queryKey: queryKeys.boards.all });
      } catch {
        setTasks(previousTasks);
        queryClient.setQueryData<Task[]>(queryKeys.tasks.board(boardId), previousTasks);
        fetchTasks();
      }
    },
    [boardId, fetchTasks, queryClient, tasks]
  );

  const addColumn = useCallback((title: string) => {
    const newColumn: Column = {
      id: title.toLowerCase().replace(/\s+/g, "_") + "_" + Date.now(),
      title,
    };
    setColumns((prev) => {
      const archiveIndex = prev.findIndex((c) => c.id === "archive");
      if (archiveIndex === -1) return [...prev, newColumn];
      const nextColumns = [...prev];
      nextColumns.splice(archiveIndex, 0, newColumn);
      return nextColumns;
    });
    return newColumn;
  }, []);

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  return {
    tasks,
    columns,
    loading,
    setTasks,
    addTask,
    updateTask,
    reorderTasks,
    moveTask,
    deleteTask,
    addColumn,
    fetchTasks,
    getTasksByStatus,
  };
}
