const API_BASE = "http://127.0.0.1:5000/api";

export async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("auth_token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Handle unauthorized - clear token and potentially redirect
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return response;
}
