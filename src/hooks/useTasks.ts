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

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const { addActivity } = useActivity();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskApi.getTasks();
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (data: CreateTaskData) => {
    const task = await taskApi.createTask(data);
    setTasks((prev) => [...prev, task]);
    addActivity("create", task.title, `Created task "${task.title}"`);
    return task;
  }, [addActivity]);

  const updateTask = useCallback(async (id: string, data: UpdateTaskData) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, updatedAt: new Date() } : t))
    );

    addActivity("update", task.title, `Updated task "${task.title}"`);

    try {
      await taskApi.updateTask(id, data);
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks, addActivity]);

  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (task.status === status) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date() } : t))
    );

    const columnTitle = columns.find((c) => c.id === status)?.title || status;
    addActivity("move", task.title, `Moved "${task.title}" to ${columnTitle}`);

    try {
      await taskApi.updateTask(id, { status });
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks, columns, addActivity]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    addActivity("delete", task.title, `Deleted task "${task.title}"`);

    try {
      await taskApi.deleteTask(id);
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks, addActivity]);

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
    addTask,
    updateTask,
    moveTask,
    deleteTask,
    addColumn,
    getTasksByStatus,
  };
}
