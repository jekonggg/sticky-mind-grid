import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messageApi } from "@/services/messageApi";
import {
  Conversation,
  Message,
  CreateConversationData,
  SendMessageData,
} from "@/types/message";
import { API_BASE, getStoredToken } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const CONVERSATIONS_QUERY_KEY = ["conversations"];
export const UNREAD_COUNT_QUERY_KEY = ["messagesUnreadCount"];
export const messagesQueryKey = (conversationId: string) => ["messages", conversationId];

/**
 * Fetch list of all conversations the user is in.
 */
export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: CONVERSATIONS_QUERY_KEY,
    queryFn: () => messageApi.getConversations(),
    refetchInterval: 15000,
  });
}

/**
 * Fetch a single conversation details.
 */
export function useConversation(conversationId?: string) {
  return useQuery<Conversation>({
    queryKey: ["conversation", conversationId],
    queryFn: () => (conversationId ? messageApi.getConversation(conversationId) : Promise.reject("No ID")),
    enabled: !!conversationId,
  });
}

/**
 * Fetch messages for a specific conversation.
 */
export function useMessagesThread(conversationId?: string) {
  return useQuery<Message[]>({
    queryKey: messagesQueryKey(conversationId || ""),
    queryFn: () => (conversationId ? messageApi.getMessages(conversationId) : Promise.resolve([])),
    enabled: !!conversationId,
    refetchInterval: 10000,
  });
}

/**
 * Fetch global unread message count for sidebar badge.
 */
export function useUnreadMessageCount() {
  return useQuery<number>({
    queryKey: UNREAD_COUNT_QUERY_KEY,
    queryFn: async () => {
      const data = await messageApi.getUnreadCount();
      return data.unreadCount;
    },
    refetchInterval: 10000,
  });
}

/**
 * Hook to send messages with optimistic updates.
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: SendMessageData) => messageApi.sendMessage(conversationId, data),
    onMutate: async (newMessageData) => {
      await queryClient.cancelQueries({ queryKey: messagesQueryKey(conversationId) });
      const previousMessages = queryClient.getQueryData<Message[]>(messagesQueryKey(conversationId)) || [];

      // Create temporary optimistic message
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId,
        senderId: user?.id || "temp-user",
        sender: user ? { ...user, fullName: user.fullName || "You" } : undefined,
        content: newMessageData.content || "",
        attachments: newMessageData.attachments || [],
        replyToId: newMessageData.replyToId,
        reactions: {},
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(messagesQueryKey(conversationId), (old = []) => [
        ...old,
        optimisticMessage,
      ]);

      return { previousMessages };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(messagesQueryKey(conversationId), context.previousMessages);
      }
      toast.error(err.message || "Failed to send message");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: messagesQueryKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
}

/**
 * Hook to mark conversation as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => messageApi.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      queryClient.setQueryData<Conversation[]>(CONVERSATIONS_QUERY_KEY, (old = []) =>
        old.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    },
  });
}

/**
 * Hook to toggle emoji reactions on a message.
 */
export function useToggleReaction(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messageApi.toggleReaction(messageId, emoji),
    onSuccess: (updatedMessage) => {
      queryClient.setQueryData<Message[]>(messagesQueryKey(conversationId), (old = []) =>
        old.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update reaction");
    },
  });
}

/**
 * Hook to delete (soft-delete) a message.
 */
export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => messageApi.deleteMessage(messageId),
    onSuccess: (deletedMessage) => {
      queryClient.setQueryData<Message[]>(messagesQueryKey(conversationId), (old = []) =>
        old.map((m) => (m.id === deletedMessage.id ? deletedMessage : m))
      );
      toast.success("Message deleted");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete message");
    },
  });
}

/**
 * Real-time SSE hook for in-app messaging.
 * Opens an EventSource to /api/messages/stream and invalidates caches when messages arrive.
 */
export function useMessageRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !user) return;

    const streamUrl = `${API_BASE}/messages/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(streamUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message:new") {
          const convId = payload.data?.conversationId || payload.data?.message?.conversationId;
          if (convId) {
            queryClient.invalidateQueries({ queryKey: messagesQueryKey(convId) });
          }
          queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
        } else if (payload.type === "conversation:created" || payload.type === "conversation:read") {
          queryClient.invalidateQueries({ queryKey: CONVERSATIONS_QUERY_KEY });
          queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
        } else if (payload.type === "message:reaction_updated" || payload.type === "message:deleted") {
          const convId = payload.data?.conversationId;
          if (convId) {
            queryClient.invalidateQueries({ queryKey: messagesQueryKey(convId) });
          }
        }
      } catch (e) {
        // Ping or non-json message
      }
    };

    es.onerror = () => {
      // Reconnection handled automatically by EventSource
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [user, queryClient]);
}
