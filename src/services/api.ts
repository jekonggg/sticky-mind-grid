import { Task, CreateTaskData, UpdateTaskData } from "@/types/task";

const API_BASE = "http://127.0.0.1:5000/api";

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

    const url = boardId ? `${API_BASE}/tasks?boardId=${boardId}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    const data = await res.json();
    return data.map(mapTask);
  },

  async createTask(data: CreateTaskData & { boardId: string }): Promise<Task> {
    if (USE_MOCK) {
       return {} as Task;
    }

    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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

    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
  },
};
