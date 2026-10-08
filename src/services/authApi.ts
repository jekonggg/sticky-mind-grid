import { AuthResponse, OAuthLoginPayload } from "@/types/user";
import { API_AUTH_BASE, getStoredToken } from "@/config/api";

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${API_AUTH_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to login");
    }
    return res.json();
  },

  async oauthLogin(payload: OAuthLoginPayload): Promise<AuthResponse> {
    const res = await fetch(`${API_AUTH_BASE}/oauth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `Failed to sign in with ${payload.provider}`);
    }
    return res.json();
  },

  async getOAuthProviders(): Promise<Record<string, { name: string; enabled: boolean }>> {
    const res = await fetch(`${API_AUTH_BASE}/oauth/providers`);
    if (!res.ok) return {
      google: { name: "Google", enabled: true },
      github: { name: "GitHub", enabled: true },
      microsoft: { name: "Microsoft", enabled: true }
    };
    return res.json();
  },

  async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const res = await fetch(`${API_AUTH_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to register");
    }
    return res.json();
  },

  async getMe(token: string) {
    const res = await fetch(`${API_AUTH_BASE}/me`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Failed to fetch user profile");
    return res.json();
  },

  async updateMe(data: { fullName?: string; avatarUrl?: string | null; password?: string; currentPassword?: string }) {
    const token = getStoredToken();
    const res = await fetch(`${API_AUTH_BASE}/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || "Failed to update profile");
    }
    return res.json();
  },

  async searchUsers(query: string) {
    const token = getStoredToken();
    const res = await fetch(`${API_AUTH_BASE}/users/search?q=${encodeURIComponent(query)}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Failed to search users");
    return res.json();
  }
};

