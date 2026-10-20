import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { NotificationTab } from "@/components/settings/tabs/NotificationTab";
import { renderWithProviders } from "../test-utils";
import { notificationApi } from "@/services/notificationApi";

vi.mock("@/services/notificationApi", () => ({
  notificationApi: {
    getVapidPublicKey: vi.fn().mockResolvedValue("test-vapid-public-key-base64"),
    registerPushSubscription: vi.fn().mockResolvedValue(undefined),
    unregisterPushSubscription: vi.fn().mockResolvedValue(undefined),
    sendTestPush: vi.fn().mockResolvedValue({ devicesNotified: 1 }),
  },
  urlBase64ToUint8Array: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
}));

describe("NotificationTab Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders NotificationTab with mobile push notifications section", () => {
    renderWithProviders(<NotificationTab />);

    expect(screen.getByText("Notifications & Audio")).toBeInTheDocument();
    expect(screen.getByText("Mobile & Browser Push Notifications")).toBeInTheDocument();
    expect(screen.getByTestId("push-notification-toggle")).toBeInTheDocument();
    expect(screen.getByText(/iPhone Users:/i)).toBeInTheDocument();
  });

  it("handles push toggle enablement when ServiceWorker and PushManager are available", async () => {
    const mockSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/fake-sub",
      toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/fake-sub", keys: { p256dh: "k", auth: "a" } }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    const mockPushManager = {
      getSubscription: vi.fn().mockResolvedValue(null),
      subscribe: vi.fn().mockResolvedValue(mockSubscription),
    };

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: mockPushManager,
        }),
      },
      configurable: true,
    });

    // Mock PushManager and Notification
    (window as any).PushManager = {};
    (window as any).Notification = {
      permission: "default",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    };

    renderWithProviders(<NotificationTab />);

    const toggle = screen.getByTestId("push-notification-toggle");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(notificationApi.getVapidPublicKey).toHaveBeenCalled();
      expect(notificationApi.registerPushSubscription).toHaveBeenCalled();
    });
  });

  it("sends test push notification when test button is clicked", async () => {
    const mockSubscription = {
      endpoint: "https://fcm.googleapis.com/fcm/send/fake-sub",
      toJSON: () => ({ endpoint: "https://fcm.googleapis.com/fcm/send/fake-sub" }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    };

    const mockPushManager = {
      getSubscription: vi.fn().mockResolvedValue(mockSubscription),
      subscribe: vi.fn().mockResolvedValue(mockSubscription),
    };

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        ready: Promise.resolve({
          pushManager: mockPushManager,
        }),
      },
      configurable: true,
    });

    (window as any).PushManager = {};
    (window as any).Notification = {
      permission: "granted",
      requestPermission: vi.fn().mockResolvedValue("granted"),
    };

    renderWithProviders(<NotificationTab />);

    await waitFor(() => {
      expect(screen.getByTestId("send-test-push-btn")).toBeInTheDocument();
    });

    const testBtn = screen.getByTestId("send-test-push-btn");
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(notificationApi.sendTestPush).toHaveBeenCalledTimes(1);
    });
  });
});
