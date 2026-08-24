import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { renderWithProviders } from "@/test/test-utils";
import { notificationApi } from "@/services/notificationApi";

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

describe("NotificationBell Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          createdAt: new Date().toISOString(),
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
          createdAt: new Date().toISOString(),
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
});
