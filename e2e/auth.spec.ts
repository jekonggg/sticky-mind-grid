import { test, expect } from "@playwright/test";
import { uniqueEmail } from "./helpers";

test.describe("Authentication", () => {
  test.describe("Login page", () => {
    test("renders login form", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    });

    test("shows app branding", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByText("Sticky Mind Grid")).toBeVisible();
    });

    test("shows link to register page", async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("link", { name: "Create one" }).click();
      await expect(page).toHaveURL("/register");
    });

    test("rejects invalid credentials", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill("nonexistent@example.com");
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page.getByText(/invalid credentials|failed to login/i)).toBeVisible({ timeout: 10000 });
    });

    test("sign in button shows loading state", async ({ page }) => {
      await page.goto("/login");
      await page.getByLabel("Email").fill("test@test.com");
      await page.getByLabel("Password").fill("password");
      await page.route("**/api/auth/login", async (route) => {
        await new Promise((r) => setTimeout(r, 400));
        await route.continue();
      });
      await page.getByRole("button", { name: "Sign In" }).click();
      await expect(page.getByText("Signing in...")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Register page", () => {
    test("renders registration form", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByRole("heading", { name: "Create an account" })).toBeVisible();
      await expect(page.getByLabel("Full Name")).toBeVisible();
      await expect(page.getByLabel("Email")).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
    });

    test("shows link to login page", async ({ page }) => {
      await page.goto("/register");
      await page.getByRole("link", { name: "Sign in" }).click();
      await expect(page).toHaveURL("/login");
    });

    test("shows password placeholder with min length hint", async ({ page }) => {
      await page.goto("/register");
      await expect(page.getByLabel("Password")).toHaveAttribute("placeholder", "Min. 6 characters");
    });

    test("successful registration redirects to home", async ({ page }) => {
      const email = uniqueEmail("register");
      await page.goto("/register");
      await page.getByLabel("Full Name").fill("New User");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL("/", { timeout: 30000 });
      await expect(page).toHaveURL("/");
    });

    test("register button shows loading state", async ({ page }) => {
      await page.goto("/register");
      await page.getByLabel("Full Name").fill("Test User");
      await page.getByLabel("Email").fill(uniqueEmail("loading"));
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Create Account" }).click();
      await expect(page.getByText("Creating account...")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Protected routes", () => {
    test("redirects / to login when not authenticated", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/login");
    });

    test("redirects /boards/:id to login when not authenticated", async ({ page }) => {
      await page.goto("/boards/some-board-id");
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Full auth flow", () => {
    test("register, use app, logout, login again", async ({ page }) => {
      const email = uniqueEmail("fullflow");
      const password = "securepass123";

      await page.goto("/register");
      await page.getByLabel("Full Name").fill("Flow User");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Create Account" }).click();
      await page.waitForURL("/", { timeout: 30000 });

      await page.getByRole("button", { name: /user menu/i }).click();
      await page.getByRole("menuitem", { name: /log out/i }).click();
      await expect(page).toHaveURL("/login");

      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign In" }).click();
      await page.waitForURL("/", { timeout: 30000 });
      await expect(page).toHaveURL("/");
    });
  });
});
