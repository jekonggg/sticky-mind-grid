/**
 * Centralized React Query Key Factory
 * Ensures consistent cache key hierarchy and predictable query invalidation across the app.
 */

export const queryKeys = {
  boards: {
    all: ["boards"] as const,
    detail: (boardId: string) => ["boards", "detail", boardId] as const,
    members: (boardId: string) => ["boardMembers", boardId] as const,
    invitations: ["pendingInvitations"] as const,
    teammates: ["teammates"] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    global: () => ["tasks", "global"] as const,
    board: (boardId: string) => ["tasks", "board", boardId] as const,
    detail: (taskId: string) => ["tasks", "detail", taskId] as const,
    trash: (boardId: string) => ["tasks", "trash", boardId] as const,
    comments: (taskId: string) => ["comments", taskId] as const,
  },
  notes: {
    all: ["notes"] as const,
    board: (boardId: string) => ["notes", boardId] as const,
  },
  messages: {
    conversations: ["conversations"] as const,
    thread: (conversationId: string) => ["messages", conversationId] as const,
    unreadCount: ["unreadMessagesCount"] as const,
  },
  notifications: {
    list: ["notifications"] as const,
    unreadCount: ["unreadCount"] as const,
  },
  users: {
    search: (query: string) => ["users", "search", query] as const,
    preferences: ["userPreferences"] as const,
  },
  activity: {
    board: (boardId: string) => ["activity", boardId] as const,
  },
} as const;
