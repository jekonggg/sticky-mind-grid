import { authenticatedFetch } from "./apiUtils";
import {
  Conversation,
  Message,
  CreateConversationData,
  SendMessageData,
} from "@/types/message";

export const messageApi = {
  async getConversations(): Promise<Conversation[]> {
    const res = await authenticatedFetch("/messages/conversations");
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to fetch conversations");
    }
    return res.json();
  },

  async getConversation(conversationId: string): Promise<Conversation> {
    const res = await authenticatedFetch(`/messages/conversations/${conversationId}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to fetch conversation");
    }
    return res.json();
  },

  async createConversation(data: CreateConversationData): Promise<Conversation> {
    const res = await authenticatedFetch("/messages/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to create conversation");
    }
    return res.json();
  },

  async getMessages(conversationId: string, limit = 50, beforeId?: string): Promise<Message[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeId) params.append("beforeId", beforeId);

    const res = await authenticatedFetch(`/messages/conversations/${conversationId}/messages?${params.toString()}`);
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to fetch messages");
    }
    return res.json();
  },

  async sendMessage(conversationId: string, data: SendMessageData): Promise<Message> {
    const res = await authenticatedFetch(`/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to send message");
    }
    return res.json();
  },

  async markAsRead(conversationId: string): Promise<{ success: boolean; conversationId: string }> {
    const res = await authenticatedFetch(`/messages/conversations/${conversationId}/read`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to mark conversation as read");
    }
    return res.json();
  },

  async toggleReaction(messageId: string, emoji: string): Promise<Message> {
    const res = await authenticatedFetch(`/messages/${messageId}/reactions`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to toggle reaction");
    }
    return res.json();
  },

  async deleteMessage(messageId: string): Promise<Message> {
    const res = await authenticatedFetch(`/messages/${messageId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to delete message");
    }
    return res.json();
  },

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    const res = await authenticatedFetch("/messages/unread-count");
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Failed to fetch unread message count");
    }
    return res.json();
  },
};
