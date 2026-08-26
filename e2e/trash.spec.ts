import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

const TEST_EMAIL = uniqueEmail("trash");

test.describe("Trash & Restore", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, TEST_EMAIL);
    await createBoard(page, "Trash Test Board");
    await navigateToBoard(page, "Trash Test Board");
  });

  test("opens trash modal", async ({ page }) => {
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByRole("heading", { name: /Trash Bin/ })).toBeVisible();
  });

  test("shows empty trash state", async ({ page }) => {
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByText("Trash bin is empty")).toBeVisible();
  });

  test("trash has close button", async ({ page }) => {
    await page.locator('button[title="View Trash Bin"]').click();
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("heading", { name: /Trash Bin/ })).not.toBeVisible();
  });

  test("deleted task appears in trash", async ({ page }) => {
    await createTask(page, "To Be Trashed");
    await page.getByText("To Be Trashed").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByText("To Be Trashed")).toBeVisible({ timeout: 10000 });
  });

  test("restores a task from trash", async ({ page }) => {
    await createTask(page, "Restore Me");
    await page.getByText("Restore Me").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByText("Restore Me")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByText("Restore Me")).not.toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Restore Me")).toBeVisible({ timeout: 5000 });
  });

  test("trash button is visible in board/list/calendar views", async ({ page }) => {
    await expect(page.locator('button[title="View Trash Bin"]')).toBeVisible();
    await page.getByRole("button", { name: "List" }).click();
    await expect(page.locator('button[title="View Trash Bin"]')).toBeVisible();
    await page.getByRole("button", { name: "Calendar" }).click();
    await expect(page.locator('button[title="View Trash Bin"]')).toBeVisible();
  });

  test("trash has search input when items exist", async ({ page }) => {
    await createTask(page, "Searchable Trash");
    await page.getByText("Searchable Trash").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByPlaceholder("Search deleted tasks...")).toBeVisible({ timeout: 10000 });
  });
});
