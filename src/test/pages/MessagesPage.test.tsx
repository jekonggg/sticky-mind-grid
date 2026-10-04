import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import MessagesPage from "@/pages/MessagesPage";
import { renderWithProviders, mockUser } from "@/test/test-utils";
import { messageApi } from "@/services/messageApi";
import { authApi } from "@/services/authApi";
import { Conversation, Message } from "@/types/message";

// Mock services
vi.mock("@/services/messageApi", () => ({
  messageApi: {
    getConversations: vi.fn(),
    getConversation: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    markAsRead: vi.fn(),
    toggleReaction: vi.fn(),
    deleteMessage: vi.fn(),
    forwardMessage: vi.fn(),
    getUnreadCount: vi.fn(),
    togglePin: vi.fn(),
  },
}));

vi.mock("@/services/authApi", () => ({
  authApi: {
    searchUsers: vi.fn(),
  },
}));

describe("MessagesPage & Messaging Flow", () => {
  const mockConversations: Conversation[] = [
    {
      id: "conv-1",
      title: null,
      displayTitle: "Sarah Connor",
      displayAvatar: null,
      type: "direct",
      createdBy: mockUser.id,
      otherUser: {
        id: "user-2",
        email: "sarah@example.com",
        fullName: "Sarah Connor",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      },
      participants: [
        {
          id: "part-1",
          conversationId: "conv-1",
          userId: mockUser.id,
          role: "member",
          joinedAt: new Date().toISOString(),
        },
        {
          id: "part-2",
          conversationId: "conv-1",
          userId: "user-2",
          role: "member",
          joinedAt: new Date().toISOString(),
        },
      ],
      participantCount: 2,
      unreadCount: 2,
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: "Let's review the API contracts.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "conv-2",
      title: "Frontend Core",
      displayTitle: "Frontend Core",
      displayAvatar: null,
      type: "group",
      createdBy: mockUser.id,
      participants: [],
      participantCount: 4,
      unreadCount: 0,
      lastMessageAt: new Date().toISOString(),
      lastMessagePreview: "PR ready for review",
      createdAt: new Date().toISOString(),
    },
  ];

  const mockMessages: Message[] = [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-2",
      sender: {
        id: "user-2",
        email: "sarah@example.com",
        fullName: "Sarah Connor",
        avatarUrl: null,
        createdAt: new Date().toISOString(),
      },
      content: "Let's review the API contracts.",
      attachments: [],
      reactions: { "👍": ["user-2"] },
      isDeleted: false,
      isPinned: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: mockUser.id,
      sender: mockUser,
      content: "Sounds great! Meeting at 3pm.",
      attachments: [],
      reactions: {},
      isDeleted: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    (messageApi.getConversations as any).mockResolvedValue(mockConversations);
    (messageApi.getConversation as any).mockResolvedValue(mockConversations[0]);
    (messageApi.getMessages as any).mockResolvedValue(mockMessages);
    (messageApi.getUnreadCount as any).mockResolvedValue({ unreadCount: 2 });
    (messageApi.markAsRead as any).mockResolvedValue({ success: true, conversationId: "conv-1" });
    (messageApi.sendMessage as any).mockImplementation((convId, data) =>
      Promise.resolve({
        id: `msg-${Date.now()}`,
        conversationId: convId,
        senderId: mockUser.id,
        sender: mockUser,
        content: data.content,
        attachments: data.attachments || [],
        reactions: {},
        isDeleted: false,
        isPinned: false,
        createdAt: new Date().toISOString(),
      })
    );
    (messageApi.toggleReaction as any).mockResolvedValue({
      ...mockMessages[0],
      reactions: { "👍": ["user-2", mockUser.id] },
    });
    (messageApi.togglePin as any).mockResolvedValue({
      ...mockMessages[0],
      isPinned: true,
    });
    (messageApi.deleteMessage as any).mockImplementation((messageId) =>
      Promise.resolve({
        id: messageId,
        conversationId: "conv-1",
        senderId: mockUser.id,
        sender: mockUser,
        content: "This message was unsent",
        attachments: [],
        reactions: {},
        isDeleted: true,
        createdAt: new Date().toISOString(),
      })
    );
    (messageApi.forwardMessage as any).mockResolvedValue({
      forwarded: [
        {
          id: "fwd-msg-1",
          conversationId: "conv-2",
          senderId: mockUser.id,
          content: "Let's review the API contracts.",
          attachments: [],
          reactions: {},
          isForwarded: true,
          isDeleted: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    (authApi.searchUsers as any).mockResolvedValue([
      { id: "user-3", email: "john@example.com", fullName: "John Doe" },
    ]);
  });

  it("renders conversation list with titles, previews, and badges", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Sarah Connor")[0]).toBeInTheDocument();
      expect(screen.getByText("Frontend Core")).toBeInTheDocument();
      expect(screen.getAllByText("Let's review the API contracts.")[0]).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // Unread badge
    });
  });

  it("renders message history and bubbles for the active conversation", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Let's review the API contracts.")[0]).toBeInTheDocument();
      expect(screen.getByText("Sounds great! Meeting at 3pm.")).toBeInTheDocument();
    });
  });

  it("allows typing and sending a new message", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Message Sarah Connor.../i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Message Sarah Connor.../i);
    fireEvent.change(input, { target: { value: "I just uploaded the architecture diagrams." } });

    const sendBtn = screen.getByTitle(/^Send message/i);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(messageApi.sendMessage).toHaveBeenCalledWith(
        "conv-1",
        expect.objectContaining({
          content: "I just uploaded the architecture diagrams.",
        })
      );
    });
  });

  it("opens New Chat modal and displays tabs for Direct Message and Group Chat", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("New Chat")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("New Chat"));

    expect(screen.getByText("New Conversation")).toBeInTheDocument();
    expect(screen.getByText("Direct Message")).toBeInTheDocument();
    expect(screen.getByText("Group Chat")).toBeInTheDocument();
  });

  it("renders messages inside a container that anchors from the bottom", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("Sounds great! Meeting at 3pm.")).toBeInTheDocument();
    });

    const messageBubble = screen.getByText("Sounds great! Meeting at 3pm.");
    const bottomContainer = messageBubble.closest(".min-h-full");
    expect(bottomContainer).toBeInTheDocument();
    expect(bottomContainer).toHaveClass("flex", "flex-col", "justify-end");
  });

  it("opens forward modal from three-dot menu and allows forwarding to target chat", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("Let's review the API contracts.")).toBeInTheDocument();
    });

    const moreBtn = screen.getAllByTitle(/More options/i)[0];
    fireEvent.keyDown(moreBtn, { key: "ArrowDown", code: "ArrowDown" });

    await waitFor(() => {
      expect(screen.getByText("Forward Message")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Forward Message"));

    await waitFor(() => {
      expect(screen.getByText(/Select one or more conversations to forward this message to/i)).toBeInTheDocument();
    });

    // Select target conversation (Frontend Core) inside Forward Dialog
    const dialog = screen.getByRole("dialog");
    const targetChat = dialog.querySelector("button:nth-child(2)") || screen.getAllByText("Frontend Core")[1];
    fireEvent.click(targetChat!);

    const submitFwd = screen.getByText(/Forward \(1\)/i);
    fireEvent.click(submitFwd);

    await waitFor(() => {
      expect(messageApi.forwardMessage).toHaveBeenCalledWith("msg-1", ["conv-2"]);
    });
  });

  it("opens unsend dialog from three-dot menu and renders unsent trail when unsend is confirmed", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("Sounds great! Meeting at 3pm.")).toBeInTheDocument();
    });

    // msg-2 belongs to currentUser (mockUser), so its three-dot menu has "Unsend Message"
    const moreBtn = screen.getAllByTitle(/More options/i)[1];
    fireEvent.keyDown(moreBtn, { key: "ArrowDown", code: "ArrowDown" });

    await waitFor(() => {
      expect(screen.getByText("Unsend Message")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Unsend Message"));

    await waitFor(() => {
      expect(screen.getByText("Unsend Message?")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByText("Unsend for Everyone");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(messageApi.deleteMessage).toHaveBeenCalledWith("msg-2");
    });
  });

  it("renders hover react action button with emoji options", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("Let's review the API contracts.")).toBeInTheDocument();
    });

    const reactTrigger = screen.getAllByTitle(/^React$/i)[0];
    fireEvent.click(reactTrigger);

    await waitFor(() => {
      expect(screen.getAllByText("🔥")[0]).toBeInTheDocument();
    });
  });

  it("triggers reply composer banner when clicking reply button", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("Let's review the API contracts.")).toBeInTheDocument();
    });

    const replyBtn = screen.getAllByTitle(/^Reply$/i)[0];
    fireEvent.click(replyBtn);

    await waitFor(() => {
      expect(screen.getByText(/Replying to Sarah Connor/i)).toBeInTheDocument();
    });
  });

  it("toggles pin on message from three-dot menu", async () => {
    renderWithProviders(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText("Let's review the API contracts.")).toBeInTheDocument();
    });

    const moreBtn = screen.getAllByTitle(/More options/i)[0];
    fireEvent.keyDown(moreBtn, { key: "ArrowDown", code: "ArrowDown" });

    await waitFor(() => {
      expect(screen.getByText("Pin Message")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Pin Message"));

    await waitFor(() => {
      expect(messageApi.togglePin).toHaveBeenCalledWith("msg-1");
    });
  });
});
