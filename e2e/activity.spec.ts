import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

test.describe("Activity History", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("activity"));
    await createBoard(page, "Activity Test Board");
    await navigateToBoard(page, "Activity Test Board");
  });

  test("opens on-demand history sheet from header", async ({ page }) => {
    await page.locator('button[title="Activity History"]').click();
    await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    await expect(page.getByText(/Created board/i)).toBeVisible();
  });

  test("shows activity after creating a task", async ({ page }) => {
    await createTask(page, "Activity Task");
    await page.locator('button[title="Activity History"]').click();
    await expect(page.getByText(/Created task "Activity Task"/i).or(page.getByText("Activity Task"))).toBeVisible({ timeout: 10000 });
  });

  test("clear activity log", async ({ page }) => {
    await createTask(page, "Clearable Task");
    await page.locator('button[title="Activity History"]').click();
    await page.locator('button[title="Clear activity log"]').waitFor({ state: "visible", timeout: 10000 });
    await page.locator('button[title="Clear activity log"]').click();
    await expect(page.getByText("No recent activity to show")).toBeVisible();
  });
});
