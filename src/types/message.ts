import { User } from "./user";

export interface MessageAttachment {
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface MessageReplySnippet {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  hasAttachments?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  content: string;
  attachments: MessageAttachment[];
  replyToId?: string | null;
  replyTo?: MessageReplySnippet | null;
  reactions: Record<string, string[]>; // { "👍": ["userId1", "userId2"] }
  isDeleted: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  user?: User;
  role: "admin" | "member";
  joinedAt: string;
  lastReadAt?: string;
}

export interface Conversation {
  id: string;
  title?: string | null;
  displayTitle: string;
  displayAvatar?: string | null;
  type: "direct" | "group";
  createdBy?: string | null;
  otherUser?: User | null;
  participants: ConversationParticipant[];
  participantCount: number;
  unreadCount: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDirectConversationData {
  type: "direct";
  recipientId: string;
}

export interface CreateGroupConversationData {
  type: "group";
  title: string;
  participantIds: string[];
}

export type CreateConversationData = CreateDirectConversationData | CreateGroupConversationData;

export interface SendMessageData {
  content?: string;
  attachments?: MessageAttachment[];
  replyToId?: string | null;
}
