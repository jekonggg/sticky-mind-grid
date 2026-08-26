import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail } from "./helpers";

const TEST_EMAIL = uniqueEmail("notifications");

test.describe("Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, TEST_EMAIL);
  });

  test("shows notification bell in header", async ({ page }) => {
    await expect(page.locator('button[title="Notifications"]')).toBeVisible();
  });

  test("opens notification popover on click", async ({ page }) => {
    await page.locator('button[title="Notifications"]').click();
    await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
  });

  test("shows empty state when no notifications", async ({ page }) => {
    await page.locator('button[title="Notifications"]').click();
    await expect(page.getByText(/caught up/i)).toBeVisible({ timeout: 5000 });
  });

  test("popover can be closed", async ({ page }) => {
    await page.locator('button[title="Notifications"]').click();
    await expect(page.getByText("Notifications", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Notifications", { exact: true })).not.toBeVisible();
  });
});
