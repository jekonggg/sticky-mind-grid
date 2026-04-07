import { Task, CreateTaskData, UpdateTaskData, TaskStatus } from "@/types/task";

const API_BASE = "/api";

// Helper to convert JSON task to Task with Date objects
const mapTask = (task: any): Task => ({
  ...task,
  createdAt: new Date(task.createdAt),
  updatedAt: new Date(task.updatedAt),
});

// Mock data for development
const mockTasks: Task[] = [
  {
    id: "1",
    title: "Design landing page",
    description: "Create wireframes and high-fidelity mockups for the new landing page.",
    status: "todo",
    priority: "high",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    title: "Set up CI/CD pipeline",
    description: "Configure GitHub Actions for automated testing and deployment.",
    status: "todo",
    priority: "medium",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    title: "Implement auth flow",
    description: "Build login and signup pages with form validation.",
    status: "in_progress",
    priority: "high",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "4",
    title: "Write API documentation",
    status: "in_progress",
    priority: "low",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "5",
    title: "Database schema review",
    description: "Review and optimize current database schema for performance.",
    status: "done",
    priority: "medium",
    attachments: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let localTasks = [...mockTasks];
let nextId = 6;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Set USE_MOCK to false when backend is available
const USE_MOCK = true;

export const taskApi = {
  async getTasks(): Promise<Task[]> {
    if (USE_MOCK) {
      await delay(400);
      return [...localTasks];
    }
    const res = await fetch(`${API_BASE}/tasks`);
    if (!res.ok) throw new Error("Failed to fetch tasks");
    const data = await res.json();
    return data.map(mapTask);
  },

  async createTask(data: CreateTaskData): Promise<Task> {
    if (USE_MOCK) {
      await delay(200);
      const task: Task = {
        id: String(nextId++),
        title: data.title,
        description: data.description,
        status: "todo",
        priority: data.priority,
        attachments: data.attachments || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      localTasks.push(task);
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
      await delay(150);
      const idx = localTasks.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error("Task not found");
      localTasks[idx] = {
        ...localTasks[idx],
        ...data,
        updatedAt: new Date(),
      };
      return { ...localTasks[idx] };
    }
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update task");
    const task = await res.json();
    return mapTask(task);
  },

  async deleteTask(id: string): Promise<void> {
    if (USE_MOCK) {
      await delay(150);
      localTasks = localTasks.filter((t) => t.id !== id);
      return;
    }
    const res = await fetch(`${API_BASE}/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
  },
};
