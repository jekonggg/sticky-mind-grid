import { Notification } from "@/types/task";
import { authenticatedFetch } from "./apiUtils";

const mapNotification = (n: any): Notification => ({
  ...n,
  createdAt: new Date(n.createdAt),
});

export const notificationApi = {
  async getNotifications(limit: number = 30): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const res = await authenticatedFetch(`/notifications?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch notifications");
    const data = await res.json();
    return {
      notifications: (data.notifications || []).map(mapNotification),
      unreadCount: data.unreadCount || 0,
    };
  },

  async markAsRead(notificationId: string): Promise<Notification> {
    const res = await authenticatedFetch(`/notifications/${notificationId}/read`, {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to mark notification as read");
    const data = await res.json();
    return mapNotification(data);
  },

  async markAllAsRead(): Promise<void> {
    const res = await authenticatedFetch("/notifications/read-all", {
      method: "PATCH",
    });
    if (!res.ok) throw new Error("Failed to mark all notifications as read");
  },
};
