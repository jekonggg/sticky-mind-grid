import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { authenticatedFetch } from "@/services/apiUtils";
import { TOKEN_STORAGE_KEY } from "@/config/api";

describe("authenticatedFetch service helper", () => {
  const originalFetch = global.fetch;
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    // Mock window.location
    delete (window as any).location;
    window.location = { href: "" } as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it("adds Authorization header when token is present in storage", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "test-jwt-token");

    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation((url, options) => {
      capturedUrl = url.toString();
      capturedOptions = options;
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    });

    const response = await authenticatedFetch("/boards");

    expect(response.status).toBe(200);
    expect(capturedUrl).toContain("/boards");
    const headers = capturedOptions?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-jwt-token");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("does not set Content-Type header when payload is FormData", async () => {
    let capturedOptions: RequestInit | undefined;

    global.fetch = vi.fn().mockImplementation((_url, options) => {
      capturedOptions = options;
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });

    const formData = new FormData();
    formData.append("file", new Blob(["content"]), "test.txt");

    await authenticatedFetch("/files/upload", {
      method: "POST",
      body: formData,
    });

    const headers = capturedOptions?.headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("clears storage and redirects to /login on 401 Unauthorized", async () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, "expired-token");
    localStorage.setItem("auth_user", JSON.stringify({ id: "123" }));

    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Token expired" }), { status: 401 })
    );

    await expect(authenticatedFetch("/tasks")).rejects.toThrow("Unauthorized");

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("auth_user")).toBeNull();
    expect(window.location.href).toBe("/login");
  });
});
