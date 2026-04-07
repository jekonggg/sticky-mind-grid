export type TaskStatus = string;
export type Priority = "low" | "medium" | "high";

export interface Attachment {
  name: string;
  url: string; // Base64 or mock URL
  type: string; // mime-type
}

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo?: string;
  dueDate?: Date;
  progress: number;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  priority: Priority;
  assignedTo?: string;
  dueDate?: Date;
  progress?: number;
  attachments?: Attachment[];
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assignedTo?: string;
  dueDate?: Date;
  progress?: number;
  attachments?: Attachment[];
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
