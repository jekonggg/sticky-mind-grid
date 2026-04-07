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
  }, [fetchTasks]);

  const addTask = useCallback(async (data: CreateTaskData) => {
    const task = await taskApi.createTask({ ...data, boardId });
    setTasks((prev) => [...prev, task]);
    addActivity("create", task.title, `Created task "${task.title}"`, boardId);
    return task;
  }, [addActivity, boardId]);

  const updateTask = useCallback(async (id: string, data: UpdateTaskData) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // Comprehensive field change tracking
    const messages: string[] = [];
    
    if (data.title && data.title !== task.title) {
      messages.push(`Renamed from "${task.title}" to "${data.title}"`);
    }
    if (data.status && data.status !== task.status) {
      const oldTitle = columns.find(c => c.id === task.status)?.title || task.status;
      const newTitle = columns.find(c => c.id === data.status)?.title || data.status;
      messages.push(`Moved from ${oldTitle} ➔ ${newTitle}`);
    }
    if (data.priority && data.priority !== task.priority) {
      messages.push(`Priority ➔ ${data.priority.toUpperCase()}`);
    }
    if (data.progress !== undefined && data.progress !== task.progress) {
      messages.push(`Progress ➔ ${data.progress}%`);
    }
    if (data.dueDate !== undefined) {
      const newDate = data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'None';
      messages.push(`Due Date ➔ ${newDate}`);
    }
    if (data.description !== undefined && data.description !== task.description) {
      messages.push(`Edited description`);
    }
    if (data.attachments && data.attachments.length !== task.attachments.length) {
      const diff = data.attachments.length - task.attachments.length;
      if (diff > 0) messages.push(`Added ${diff} attachment${diff > 1 ? 's' : ''}`);
      else messages.push(`Removed ${Math.abs(diff)} attachment${Math.abs(diff) > 1 ? 's' : ''}`);
    }

    const finalMessage = messages.length > 0 ? messages.join(" | ") : `Updated task details`;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, updatedAt: new Date() } : t))
    );

    addActivity("update", data.title || task.title, finalMessage, boardId);

    try {
      await taskApi.updateTask(id, data);
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks, columns, addActivity, boardId]);

  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.status === status) return;

    const oldTitle = columns.find(c => c.id === task.status)?.title || task.status;
    const newTitle = columns.find(c => c.id === status)?.title || status;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date() } : t))
    );

    addActivity("move", task.title, `Moved from ${oldTitle} ➔ ${newTitle}`, boardId);

    try {
      await taskApi.updateTask(id, { status });
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks, columns, addActivity, boardId]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    addActivity("delete", task.title, `Permanently deleted task "${task.title}"`, boardId);

    try {
      await taskApi.deleteTask(id);
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks, addActivity, boardId]);

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
