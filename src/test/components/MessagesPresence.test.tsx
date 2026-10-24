import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatArea } from "@/components/messages/ChatArea";
import { Conversation } from "@/types/message";
import { User } from "@/types/user";
import { renderWithProviders } from "@/test/test-utils";

const onlineUser: User = {
  id: "user-online",
  email: "online@example.com",
  fullName: "Online User",
  avatarUrl: null,
  isOnline: true,
  createdAt: new Date().toISOString(),
};

const offlineUser: User = {
  id: "user-offline",
  email: "offline@example.com",
  fullName: "Offline User",
  avatarUrl: null,
  isOnline: false,
  createdAt: new Date().toISOString(),
};

function makeDirectConversation(id: string, otherUser: User): Conversation {
  return {
    id,
    title: null,
    displayTitle: otherUser.fullName || otherUser.email,
    displayAvatar: null,
    type: "direct",
    createdBy: "user-me",
    otherUser,
    participants: [],
    participantCount: 2,
    unreadCount: 0,
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: "Hello",
    createdAt: new Date().toISOString(),
  };
}

const groupConversation: Conversation = {
  id: "conv-group",
  title: "Project Team",
  displayTitle: "Project Team",
  displayAvatar: null,
  type: "group",
  createdBy: "user-me",
  otherUser: null,
  participants: [],
  participantCount: 3,
  unreadCount: 0,
  lastMessageAt: new Date().toISOString(),
  lastMessagePreview: "Group update",
  createdAt: new Date().toISOString(),
};

const chatAreaProps = {
  messages: [],
  isLoadingMessages: false,
  onSendMessage: vi.fn().mockResolvedValue(undefined),
  onToggleReaction: vi.fn().mockResolvedValue(undefined),
  onDeleteMessage: vi.fn().mockResolvedValue(undefined),
};

describe("Message presence indicators", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("renders green online and muted offline indicators in the conversation list", () => {
    renderWithProviders(
      <ConversationList
        conversations={[
          makeDirectConversation("conv-online", onlineUser),
          makeDirectConversation("conv-offline", offlineUser),
          groupConversation,
        ]}
        onSelectConversation={vi.fn()}
        onOpenNewChat={vi.fn()}
      />
    );

    expect(screen.getAllByLabelText("Online")).toHaveLength(1);
    expect(screen.getAllByLabelText("Offline")).toHaveLength(1);
    expect(screen.getByText("Project Team")).toBeInTheDocument();
  });

  it("shows the online indicator in a direct chat header", () => {
    renderWithProviders(
      <ChatArea
        conversation={makeDirectConversation("conv-online", onlineUser)}
        {...chatAreaProps}
      />
    );

    expect(screen.getByLabelText("Online")).toBeInTheDocument();
  });

  it("shows the offline indicator in a direct chat header when presence is false", () => {
    renderWithProviders(
      <ChatArea
        conversation={makeDirectConversation("conv-offline", offlineUser)}
        {...chatAreaProps}
      />
    );

    expect(screen.getByLabelText("Offline")).toBeInTheDocument();
  });

  it("does not show a presence indicator for group conversations", () => {
    renderWithProviders(
      <ChatArea conversation={groupConversation} {...chatAreaProps} />
    );

    expect(screen.queryByLabelText("Online")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Offline")).not.toBeInTheDocument();
  });
});
