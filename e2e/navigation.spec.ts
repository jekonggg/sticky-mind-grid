import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("shows 404 page for unknown routes", async ({ page }) => {
    await page.goto("/some-unknown-route");
    await expect(page.getByText(/not found/i)).toBeVisible();
  });

  test("404 page has link back to home", async ({ page }) => {
    await page.goto("/some-unknown-route");
    await page.getByRole("link", { name: /return to home/i }).click();
    await expect(page).toHaveURL("/login");
  });

  test("displays app branding on login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Sticky Mind Grid")).toBeVisible();
  });

  test("login page has correct form structure", async ({ page }) => {
    await page.goto("/login");
    const form = page.locator("form");
    await expect(form).toBeVisible();
    await expect(form.getByLabel("Email")).toHaveAttribute("type", "email");
    await expect(form.getByLabel("Password")).toHaveAttribute("type", "password");
  });

  test("register page has correct form structure", async ({ page }) => {
    await page.goto("/register");
    const form = page.locator("form");
    await expect(form).toBeVisible();
    await expect(form.getByLabel("Email")).toHaveAttribute("type", "email");
    await expect(form.getByLabel("Password")).toHaveAttribute("type", "password");
  });
});
