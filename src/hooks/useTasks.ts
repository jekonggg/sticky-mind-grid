import { useState, useEffect, useCallback } from "react";
import { Task, CreateTaskData, UpdateTaskData, TaskStatus, Column } from "@/types/task";
import { taskApi } from "@/services/api";
import { useActivity } from "./useActivity";

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
  { id: "archive", title: "Archive" },
];

export function useTasks(boardId: string, initialColumns: Column[] = []) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [loading, setLoading] = useState(true);
  const { addActivity } = useActivity();

  // Sync columns when board updates
  useEffect(() => {
    if (initialColumns && initialColumns.length > 0) {
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  const fetchTasks = useCallback(async () => {
    if (!boardId) return;
    try {
      setLoading(true);
      const data = await taskApi.getTasks(boardId);
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && boardId) {
        taskApi.getTasks(boardId).then((data) => setTasks(data)).catch(() => {});
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchTasks, boardId]);

  const addTask = useCallback(async (data: CreateTaskData) => {
    const task = await taskApi.createTask({ ...data, boardId });
    setTasks((prev) => [...prev, task]);
    addActivity("create", task.title, `Created task "${task.title}"`, boardId);
    return task;
  }, [addActivity, boardId]);

  const updateTask = useCallback(async (id: string, data: UpdateTaskData) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Optimistic local update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, updatedAt: new Date() } : t))
    );

    try {
      const updated = await taskApi.updateTask(id, data);
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks]);

  const reorderTasks = useCallback(async (items: Array<{ id: string; status?: string; position: number }>) => {
    if (!boardId || items.length === 0) return;

    // Optimistic local reorder
    setTasks((prev) => {
      const itemMap = new Map(items.map((i) => [i.id, i]));
      const updated = prev.map((t) => {
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
      return updated.sort((a, b) => (a.position || 0) - (b.position || 0));
    });

    try {
      const updatedList = await taskApi.reorderTasks(boardId, items);
      if (updatedList && updatedList.length > 0) {
        setTasks(updatedList);
      }
    } catch {
      fetchTasks();
    }
  }, [boardId, fetchTasks]);

  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.status === status) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date() } : t))
    );

    try {
      await taskApi.updateTask(id, { status });
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await taskApi.deleteTask(id);
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks]);

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
