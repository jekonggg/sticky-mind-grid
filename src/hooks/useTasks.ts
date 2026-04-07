import { useState, useEffect, useCallback } from "react";
import { Task, CreateTaskData, UpdateTaskData, TaskStatus } from "@/types/task";
import { taskApi } from "@/services/api";

import { useActivity } from "./useActivity";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
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

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data, updatedAt: new Date() } : t))
    );

    addActivity("update", task.title, `Updated task "${task.title}"`);

    try {
      await taskApi.updateTask(id, data);
    } catch {
      fetchTasks(); // Rollback on error
    }
  }, [fetchTasks, tasks, addActivity]);

  const moveTask = useCallback(async (id: string, status: TaskStatus) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const oldStatus = task.status;
    if (oldStatus === status) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status, updatedAt: new Date() } : t))
    );

    const statusMap: Record<TaskStatus, string> = {
      todo: "To Do",
      in_progress: "In Progress",
      done: "Done",
    };

    addActivity("move", task.title, `Moved "${task.title}" to ${statusMap[status]}`);

    try {
      await taskApi.updateTask(id, { status });
    } catch {
      fetchTasks();
    }
  }, [fetchTasks, tasks, addActivity]);

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

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  return { tasks, loading, addTask, updateTask, moveTask, deleteTask, getTasksByStatus };
}
