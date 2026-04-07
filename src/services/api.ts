import { Task, CreateTaskData, UpdateTaskData } from "@/types/task";

const API_BASE = "/api";

const mapTask = (task: any): Task => ({
  ...task,
  createdAt: new Date(task.createdAt),
  updatedAt: new Date(task.updatedAt),
});

const mockTasks: Task[] = [
  {
    id: "1",
    boardId: "board-1",
    title: "Design landing page",
    description: "Create wireframes and high-fidelity mockups for the new landing page.",
    status: "todo",
    priority: "high",
    progress: 0,
    attachments: [],
    createdAt: new Date(Date.now() - 2 * 86400000),
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    id: "task-2",
    boardId: "board-1",
    title: "Feature prioritization",
    description: "Align with stakeholders on Q3 roadmap",
    status: "in_progress",
    priority: "medium",
    progress: 0,
    attachments: [],
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date(Date.now() - 7200000),
  },
  {
    id: "task-3",
    boardId: "board-1",
    title: "Design mocks review",
    description: "Finalize visual language for the dashboard",
    status: "todo",
    priority: "high",
    progress: 0,
    attachments: [],
    createdAt: new Date(Date.now() - 1 * 86400000),
    updatedAt: new Date(Date.now() - 43200000),
  },
  {
    id: "task-4",
    boardId: "board-2",
    title: "Setup CI/CD pipeline",
    status: "todo",
    priority: "low",
    progress: 0,
    attachments: [],
    createdAt: new Date(Date.now() - 5 * 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: "task-5",
    boardId: "board-2",
    title: "API documentation",
    description: "Export Swagger definitions for core services",
    status: "done",
    priority: "medium",
    progress: 100,
    attachments: [],
    createdAt: new Date(Date.now() - 10 * 86400000),
    updatedAt: new Date(Date.now() - 172800000),
  },
];

let nextId = 6;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const USE_MOCK = true;

export const taskApi = {
  async getTasks(boardId?: string): Promise<Task[]> {
    if (USE_MOCK) {
      await delay(400);
      if (boardId) return mockTasks.filter((t) => t.boardId === boardId);
      return [...mockTasks];
    }
    const url = boardId ? `${API_BASE}/tasks?boardId=${boardId}` : `${API_BASE}/tasks`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    const data = await res.json();
    return data.map(mapTask);
  },

  async createTask(data: CreateTaskData & { boardId: string }): Promise<Task> {
    if (USE_MOCK) {
      await delay(300);
      const task: Task = {
        id: `task-${nextId++}`,
        boardId: data.boardId,
        title: data.title,
        description: data.description,
        status: "todo",
        priority: data.priority,
        progress: data.progress || 0,
        attachments: data.attachments || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockTasks.push(task);
      return task;
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
      await delay(200);
      const index = mockTasks.findIndex((t) => t.id === id);
      if (index === -1) throw new Error("Task not found");
      mockTasks[index] = {
        ...mockTasks[index],
        ...data,
        updatedAt: new Date(),
      };
      return mockTasks[index];
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
      await delay(200);
      const index = mockTasks.findIndex((t) => t.id === id);
      if (index !== -1) mockTasks.splice(index, 1);
      return;
    }
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
  },
};
