import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

test.describe("Activity Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("activity"));
    await createBoard(page, "Activity Test Board");
    await navigateToBoard(page, "Activity Test Board");
  });

  test("shows History heading", async ({ page }) => {
    await expect(page.getByText("History")).toBeVisible();
  });

  test("shows initial board creation activity", async ({ page }) => {
    await expect(page.getByText(/Created board/i)).toBeVisible();
  });

  test("shows activity after creating a task", async ({ page }) => {
    await createTask(page, "Activity Task");
    await expect(page.getByText("created").first()).toBeVisible({ timeout: 10000 });
  });

  test("clear activity log", async ({ page }) => {
    await createTask(page, "Clearable Task");
    await page.locator('button[title="Clear activity log"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('button[title="Clear activity log"]').click();
    await expect(page.getByText("No recent activity to show")).toBeVisible();
  });

  test("sidebar can be collapsed and expanded", async ({ page }) => {
    await page.locator('button[title="Collapse Activity"]').click();
    await expect(page.locator('button[title="Expand Activity"]')).toBeVisible();
    await page.locator('button[title="Expand Activity"]').click();
    await expect(page.getByText("History")).toBeVisible();
  });
});
