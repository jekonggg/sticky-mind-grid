import { API_BASE, getStoredToken } from "@/config/api";
import { authenticatedFetch } from "./apiUtils";
import { UserSyncedPreferences } from "@/types/settings";

export interface SystemHealth {
  status: "healthy" | "degraded";
  database: "connected" | "disconnected";
  version: string;
  commit?: string;
  environment: string;
  timestamp: string;
}

export const userApi = {
  async heartbeatPresence(): Promise<{ isOnline: boolean }> {
    const res = await authenticatedFetch("/presence/heartbeat", { method: "POST" });
    if (!res.ok) {
      throw new Error("Failed to send presence heartbeat");
    }
    return res.json();
  },

  async markPresenceOffline(token: string): Promise<void> {
    // Called from effect cleanup on logout, after the token has been removed
    // from storage. Pass the captured token explicitly so the request can
    // still authenticate without triggering the usual 401 redirect.
    const res = await authenticatedFetch(
      "/presence/offline",
      { method: "POST", keepalive: true },
      token
    );
    if (!res.ok) {
      throw new Error("Failed to mark presence offline");
    }
  },

  async getPreferences(): Promise<UserSyncedPreferences> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/users/me/preferences`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch user preferences");
    }
    return res.json();
  },

  async updatePreferences(
    data: Partial<UserSyncedPreferences>
  ): Promise<UserSyncedPreferences> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/users/me/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error("Failed to update preferences");
    }
    return res.json();
  },

  async exportUserData(): Promise<void> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/users/me/export`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to export user data");
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sticky-mind-grid-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  async getHealth(): Promise<SystemHealth> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok && res.status !== 503) {
      throw new Error("Failed to check system health");
    }
    return res.json();
  },

  async getTeammates(): Promise<Array<{
    id: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
    role: string;
    sharedBoards: Array<{ id: string; name: string; emoji?: string; color?: string; role: string }>;
  }>> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/users/teammates`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to fetch teammates");
    }
    return res.json();
  },

  async searchUsers(query: string): Promise<Array<{ id: string; email: string; fullName?: string; avatarUrl?: string }>> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error("Failed to search users");
    }
    return res.json();
  },

  async deleteAccount(): Promise<void> {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/users/me`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to delete account");
    }
  },
};
