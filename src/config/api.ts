// Centralized API and environment configuration

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string) || "http://127.0.0.1:5000/api";

export const API_AUTH_BASE: string = `${API_BASE}/auth`;
