export type TaskStatus = "todo" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority: Priority;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
}

export type ActivityType = "create" | "move" | "update" | "delete";

export interface Activity {
  id: string;
  type: ActivityType;
  taskTitle: string;
  message: string;
  timestamp: Date;
}
