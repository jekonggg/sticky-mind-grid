export type TaskStatus = string;
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority: Priority;
  attachments?: string[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  attachments?: string[];
}

export type ActivityType = "create" | "move" | "update" | "delete";

export interface Activity {
  id: string;
  type: ActivityType;
  taskTitle: string;
  message: string;
  timestamp: Date;
}

export interface Column {
  id: string;
  title: string;
}
