import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { renderWithProviders } from "@/test/test-utils";
import { notificationApi } from "@/services/notificationApi";
import { boardApi } from "@/services/boardApi";

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

vi.mock("@/services/boardApi", () => ({
  boardApi: {
    getPendingInvitations: vi.fn().mockResolvedValue([]),
  },
}));

describe("NotificationBell Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue([]);
  });

  it("renders notification bell with badge counter for unread notifications", async () => {
    vi.mocked(notificationApi.getNotifications).mockResolvedValue({
      notifications: [
        {
          id: "notif-1",
          userId: "user-123",
          type: "board_invite",
          title: "Board Invitation",
          message: "You were invited to Sprint Alpha",
          isRead: false,
          link: "/boards/board-1",
          createdAt: new Date(),
        },
      ],
      unreadCount: 1,
    });

    renderWithProviders(<NotificationBell />);

    // Check badge shows 1
    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    // Click trigger to open popover
    const bellBtn = screen.getByTitle("Notifications");
    fireEvent.click(bellBtn);

    // Verify notification content
    await waitFor(() => {
      expect(screen.getByText("Board Invitation")).toBeInTheDocument();
      expect(screen.getByText("You were invited to Sprint Alpha")).toBeInTheDocument();
    });
  });

  it("counts pending invitations toward the bell badge when not already counted in unread notifications", async () => {
    vi.mocked(notificationApi.getNotifications).mockResolvedValue({
      notifications: [],
      unreadCount: 0,
    });
    vi.mocked(boardApi.getPendingInvitations).mockResolvedValue([
      {
        id: "inv-1",
        boardId: "board-pending-1",
        role: "editor",
        status: "pending",
        createdAt: new Date().toISOString(),
        board: {
          id: "board-pending-1",
          name: "Client Workspace",
          color: "hsl(220, 80%, 56%)",
          ownerName: "Bob Manager",
        },
      },
    ]);

    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByTestId("notification-bell-badge")).toHaveTextContent("1");
    });
  });

  it("calls markAllAsRead when Mark all read is clicked", async () => {
    vi.mocked(notificationApi.getNotifications).mockResolvedValue({
      notifications: [
        {
          id: "notif-1",
          userId: "user-123",
          type: "member_left",
          title: "Member Left Board",
          message: "John Doe left the board",
          isRead: false,
          createdAt: new Date(),
        },
      ],
      unreadCount: 1,
    });
    vi.mocked(notificationApi.markAllAsRead).mockResolvedValue();

    renderWithProviders(<NotificationBell />);

    const bellBtn = screen.getByTitle("Notifications");
    fireEvent.click(bellBtn);

    const markAllBtn = await screen.findByText(/Mark all read/i);
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(notificationApi.markAllAsRead).toHaveBeenCalled();
    });
  });

  it("renders board_ownership_transferred notification with proper content and navigates on click", async () => {
    vi.mocked(notificationApi.getNotifications).mockResolvedValue({
      notifications: [
        {
          id: "notif-own-1",
          userId: "user-123",
          type: "board_ownership_transferred",
          title: "Board Ownership Transferred",
          message: "The previous owner deleted their account. You are now the Owner of \"Sprint Alpha\".",
          isRead: false,
          link: "/boards/board-1",
          createdAt: new Date(),
        },
      ],
      unreadCount: 1,
    });
    vi.mocked(notificationApi.markAsRead).mockResolvedValue({} as any);

    renderWithProviders(<NotificationBell />);

    const bellBtn = screen.getByTitle("Notifications");
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText("Board Ownership Transferred")).toBeInTheDocument();
      expect(
        screen.getByText(/The previous owner deleted their account. You are now the Owner/i)
      ).toBeInTheDocument();
    });

    const notifItem = screen.getByText("Board Ownership Transferred");
    fireEvent.click(notifItem);

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith("notif-own-1");
    });
  });
});
