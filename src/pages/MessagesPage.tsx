import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useConversations,
  useMessagesThread,
  useSendMessage,
  useMarkAsRead,
  useToggleReaction,
  useDeleteMessage,
  useMessageRealtime,
} from "@/hooks/useMessages";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatArea } from "@/components/messages/ChatArea";
import { NewChatModal } from "@/components/messages/NewChatModal";
import { MessageAttachment } from "@/types/message";

export default function MessagesPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();

  // Initialize real-time SSE listener
  useMessageRealtime();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [mobileShowList, setMobileShowList] = useState(!conversationId);

  // Conversations query
  const { data: conversations = [], isLoading: isLoadingConversations } = useConversations();

  // Determine active conversation
  const selectedConvId = conversationId || (conversations.length > 0 ? conversations[0].id : undefined);
  const activeConversation = conversations.find((c) => c.id === selectedConvId) || null;

  // Active messages query & mutations
  const { data: messages = [], isLoading: isLoadingMessages } = useMessagesThread(selectedConvId);
  const sendMessageMutation = useSendMessage(selectedConvId || "");
  const markAsReadMutation = useMarkAsRead();
  const toggleReactionMutation = useToggleReaction(selectedConvId || "");
  const deleteMessageMutation = useDeleteMessage(selectedConvId || "");

  // Auto-mark conversation as read when selected
  useEffect(() => {
    if (selectedConvId && activeConversation && (activeConversation.unreadCount || 0) > 0) {
      markAsReadMutation.mutate(selectedConvId);
    }
  }, [selectedConvId, activeConversation, markAsReadMutation]);

  // Update mobile list visibility when route changes
  useEffect(() => {
    if (conversationId) {
      setMobileShowList(false);
    }
  }, [conversationId]);

  const handleSelectConversation = (id: string) => {
    navigate(`/messages/${id}`);
    setMobileShowList(false);
  };

  const handleSendMessage = async (data: {
    content: string;
    attachments: MessageAttachment[];
    replyToId?: string | null;
  }) => {
    if (!selectedConvId) return;
    return sendMessageMutation.mutateAsync(data);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    return toggleReactionMutation.mutateAsync({ messageId, emoji });
  };

  const handleDeleteMessage = async (messageId: string) => {
    return deleteMessageMutation.mutateAsync(messageId);
  };

  return (
    <div className="flex-1 flex h-full w-full overflow-hidden bg-background">
      {/* 1. LEFT CONVERSATION LIST (Desktop persistent, mobile toggleable) */}
      <div
        className={`${
          mobileShowList ? "flex w-full" : "hidden md:flex"
        } md:w-80 h-full shrink-0`}
      >
        <ConversationList
          conversations={conversations}
          activeConversationId={selectedConvId}
          onSelectConversation={handleSelectConversation}
          onOpenNewChat={() => setIsNewChatOpen(true)}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* 2. RIGHT CHAT AREA */}
      <div
        className={`${
          mobileShowList ? "hidden md:flex" : "flex"
        } flex-1 h-full min-w-0 flex-col`}
      >
        <ChatArea
          conversation={activeConversation}
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          onSendMessage={handleSendMessage}
          onToggleReaction={handleToggleReaction}
          onDeleteMessage={handleDeleteMessage}
          onToggleMobileSidebar={() => setMobileShowList(true)}
        />
      </div>

      {/* 3. NEW CHAT MODAL */}
      <NewChatModal
        open={isNewChatOpen}
        onOpenChange={setIsNewChatOpen}
        onSelectConversation={handleSelectConversation}
      />
    </div>
  );
}
