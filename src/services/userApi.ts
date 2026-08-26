import { API_BASE, getStoredToken } from "@/config/api";
import { UserSyncedPreferences } from "@/types/settings";

export interface SystemHealth {
  status: "healthy" | "degraded";
  database: "connected" | "disconnected";
  version: string;
  environment: string;
  timestamp: string;
}

export const userApi = {
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
};
