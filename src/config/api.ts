// Centralized API and environment configuration

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:5000/api";

export const API_AUTH_BASE: string = `${API_BASE}/auth`;

// Single source of truth for the auth token storage key.
// All token reads/writes must go through these helpers to avoid key drift.
export const TOKEN_STORAGE_KEY = "auth_token";

export const getStoredToken = (): string | null =>
  localStorage.getItem(TOKEN_STORAGE_KEY);
