export type TaskStatus = string;
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Attachment {
  id?: string;
  name: string;
  url: string; // Base64 or mock URL
  type: string; // mime-type
  size?: string | number;
  uploadedAt?: Date | string;
}

export interface ChecklistItem {
  id: string;
  title?: string;
  text?: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  boardId: string;
  title: string;
  emoji?: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo?: string | null;
  assignee?: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
  dueDate?: Date;
  progress: number;
  position?: number;
  checklist?: ChecklistItem[];
  tags?: Tag[];
  attachments: Attachment[];
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskData {
  title: string;
  emoji?: string;
  description?: string;
  status?: TaskStatus;
  priority: Priority;
  assignedTo?: string;
  dueDate?: Date;
  progress?: number;
  position?: number;
  checklist?: ChecklistItem[];
  tags?: Tag[];
  attachments?: Attachment[];
}

export interface UpdateTaskData {
  title?: string;
  emoji?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  assignedTo?: string;
  dueDate?: Date;
  progress?: number;
  position?: number;
  checklist?: ChecklistItem[];
  tags?: Tag[];
  attachments?: Attachment[];
}

export type ActivityType = "create" | "move" | "update" | "delete";

export interface Activity {
  id: string;
  type: ActivityType;
  taskTitle: string;
  message: string;
  timestamp: Date;
  userId?: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
}

export interface Column {
  id: string;
  title: string;
  emoji?: string;
  color?: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
  };
  content: string;
  mentions: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export type NotificationType =
  | "mention"
  | "assignment"
  | "task_comment"
  | "invite"
  | "board_invite"
  | "invite_accepted"
  | "invite_declined"
  | "member_left"
  | "member_removed"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}
