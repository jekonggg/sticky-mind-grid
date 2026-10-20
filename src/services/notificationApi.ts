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

  async getVapidPublicKey(): Promise<string> {
    const res = await authenticatedFetch("/notifications/vapid-public-key");
    if (!res.ok) throw new Error("Failed to fetch VAPID public key");
    const data = await res.json();
    return data.publicKey;
  },

  async registerPushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
    const res = await authenticatedFetch("/notifications/push-subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subscription }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to register push subscription");
    }
  },

  async unregisterPushSubscription(endpoint: string): Promise<void> {
    const res = await authenticatedFetch("/notifications/push-subscriptions", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endpoint }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to unregister push subscription");
    }
  },

  async sendTestPush(): Promise<{ devicesNotified: number }> {
    const res = await authenticatedFetch("/notifications/test-push", {
      method: "POST",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to send test push notification");
    }
    return res.json();
  },
};

/**
 * Converts a URL-safe base64 string to a Uint8Array required by pushManager.subscribe()
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
