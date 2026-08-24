import { Task, CreateTaskData, UpdateTaskData } from "@/types/task";
import { authenticatedFetch } from "./apiUtils";

const mapTask = (task: any): Task => ({
  ...task,
  createdAt: new Date(task.createdAt),
  updatedAt: new Date(task.updatedAt),
});

const USE_MOCK = false;

export const taskApi = {
  async getTasks(boardId?: string): Promise<Task[]> {
    if (USE_MOCK) {
      return [];
    }

    const endpoint = boardId ? `/tasks?boardId=${boardId}` : "/tasks";
    const res = await authenticatedFetch(endpoint);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    const data = await res.json();
    return data.map(mapTask);
  },

  async createTask(data: CreateTaskData & { boardId: string }): Promise<Task> {
    if (USE_MOCK) {
       return {} as Task;
    }

    const res = await authenticatedFetch("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create task");
    const task = await res.json();
    return mapTask(task);
  },

  async updateTask(id: string, data: UpdateTaskData): Promise<Task> {
    if (USE_MOCK) {
       return {} as Task;
    }

    const res = await authenticatedFetch(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update task");
    const task = await res.json();
    return mapTask(task);
  },

  async deleteTask(id: string): Promise<void> {
    if (USE_MOCK) {
       return;
    }

    const res = await authenticatedFetch(`/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
  },

  async reorderTasks(boardId: string, items: Array<{ id: string; status?: string; position: number }>): Promise<Task[]> {
    if (USE_MOCK) {
      return [];
    }

    const res = await authenticatedFetch("/tasks/reorder", {
      method: "PATCH",
      body: JSON.stringify({ boardId, items }),
    });
    if (!res.ok) throw new Error("Failed to reorder tasks");
    const data = await res.json();
    return data.map(mapTask);
  },

  async getTrash(boardId: string): Promise<Task[]> {
    const res = await authenticatedFetch(`/boards/${boardId}/trash`);
    if (!res.ok) throw new Error("Failed to fetch trash");
    const data = await res.json();
    return data.map(mapTask);
  },

  async restoreTask(taskId: string): Promise<Task> {
    const res = await authenticatedFetch(`/tasks/${taskId}/restore`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to restore task");
    const data = await res.json();
    return mapTask(data);
  },

  async permanentlyDeleteTask(taskId: string): Promise<void> {
    const res = await authenticatedFetch(`/tasks/${taskId}/permanent`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to permanently delete task");
  },

  async emptyTrash(boardId: string): Promise<void> {
    const res = await authenticatedFetch(`/boards/${boardId}/trash`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to empty trash");
  },
};
