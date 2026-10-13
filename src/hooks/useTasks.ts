import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { Task, CreateTaskData, UpdateTaskData, TaskStatus, Column } from "@/types/task";
import { taskApi } from "@/services/api";
import { useActivity } from "./useActivity";
import { AuthContext } from "@/contexts/AuthContext";

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "done", title: "Done" },
  { id: "archive", title: "Archive" },
];

export interface TasksCacheEntry {
  tasks: Task[];
  timestamp: number;
  userId?: string;
}

export const tasksCache = new Map<string, TasksCacheEntry>();
export const TASKS_CACHE_TTL_MS = 60_000;

export function clearTasksCache(boardId?: string) {
  if (boardId) {
    tasksCache.delete(boardId);
  } else {
    tasksCache.clear();
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:session-expired", () => clearTasksCache());
  window.addEventListener("smg-dev-data-mode-changed", () => clearTasksCache());
}

export function useTasks(boardId: string, initialColumns: Column[] = []) {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const cachedEntry = boardId ? tasksCache.get(boardId) : undefined;
  const isCacheValidForUser = cachedEntry && (!cachedEntry.userId || cachedEntry.userId === user?.id);
  const hasCachedData = Boolean(isCacheValidForUser && cachedEntry?.tasks);

  const [tasks, setTasksState] = useState<Task[]>(() => (hasCachedData ? cachedEntry!.tasks : []));
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [loading, setLoading] = useState(!hasCachedData);
  const { addActivity } = useActivity();
  const hasLoadedRef = useRef(hasCachedData);

  const setTasks = useCallback(
    (action: React.SetStateAction<Task[]>) => {
      setTasksState((prev) => {
        const next = typeof action === "function" ? action(prev) : action;
        if (boardId) {
          tasksCache.set(boardId, { tasks: next, timestamp: Date.now(), userId: user?.id });
        }
        return next;
      });
    },
    [boardId, user?.id]
  );

  // Sync columns when board updates
  useEffect(() => {
    if (initialColumns && initialColumns.length > 0) {
      setColumns(initialColumns);
    }
  }, [initialColumns]);

  const fetchTasks = useCallback(async (forceLoading = false) => {
    if (!boardId) return;
    const hasCache = tasksCache.has(boardId);
    try {
      if (forceLoading || (!hasLoadedRef.current && !hasCache)) {
        setLoading(true);
      }
      const data = await taskApi.getTasks(boardId);
      setTasks(data);
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId, setTasks]);

  useEffect(() => {
    const cached = boardId ? tasksCache.get(boardId) : undefined;
    const isFresh =
      cached &&
      (!cached.userId || cached.userId === user?.id) &&
      Date.now() - cached.timestamp < TASKS_CACHE_TTL_MS;

    if (!isFresh) {
      fetchTasks(false);
    } else {
      hasLoadedRef.current = true;
    }

    const handleRefresh = () => {
      fetchTasks(false);
    };
    const handleDataModeChange = () => {
      clearTasksCache();
      fetchTasks(true);
    };

    window.addEventListener("smg-dev-data-mode-changed", handleDataModeChange);
    window.addEventListener("task-updated", handleRefresh);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && boardId) {
        taskApi
          .getTasks(boardId)
          .then((data) => {
            setTasks(data);
          })
          .catch(() => {});
      }
    }, 4000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("smg-dev-data-mode-changed", handleDataModeChange);
      window.removeEventListener("task-updated", handleRefresh);
    };
  }, [boardId, fetchTasks, setTasks, user?.id]);

  const addTask = useCallback(async (data: CreateTaskData) => {
    const task = await taskApi.createTask({ ...data, boardId });
    setTasks((prev) => [...prev, task]);
    addActivity("create", task.title, `Created task "${task.title}"`, boardId);
    return task;
  }, [addActivity, boardId, setTasks]);

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
      return updated;
    } catch (err: any) {
      if (err?.status === 409) {
        if (err.currentTask) {
          setTasks((prev) => prev.map((t) => (t.id === id ? err.currentTask : t)));
        } else {
          fetchTasks();
        }
        throw err;
      }
      fetchTasks();
    }
  }, [fetchTasks, setTasks, tasks]);

  const reorderTasks = useCallback(async (items: Array<{ id: string; status?: string; fromStatus?: string; position: number }>) => {
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
        setTasks((prev) => {
          const updatedMap = new Map(updatedList.map((t) => [t.id, t]));
          return prev.map((t) => updatedMap.get(t.id) || t);
        });
      }
    } catch {
      fetchTasks();
    }
  }, [boardId, fetchTasks, setTasks]);

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
  }, [fetchTasks, setTasks, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await taskApi.deleteTask(id);
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, setTasks, tasks]);

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
