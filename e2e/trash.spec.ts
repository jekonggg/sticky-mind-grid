import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

test.describe("Trash & Restore", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("trash"));
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
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();
    await expect(page.getByRole("heading", { name: /Trash Bin/ })).not.toBeVisible();
  });

  test("deleted task appears in trash", async ({ page }) => {
    await createTask(page, "To Be Trashed");
    await page.locator("main").getByText("To Be Trashed").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByRole("dialog").getByText("To Be Trashed")).toBeVisible({ timeout: 10000 });
  });

  test("restores a task from trash", async ({ page }) => {
    await createTask(page, "Restore Me");
    await page.locator("main").getByText("Restore Me").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByRole("dialog").getByText("Restore Me")).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Restore" }).click();
    await expect(page.getByRole("dialog").getByText("Restore Me")).not.toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).first().click();
    await expect(page.locator("main").getByText("Restore Me")).toBeVisible({ timeout: 5000 });
  });

  test("trash button is visible in board/list/calendar views", async ({ page }) => {
    await expect(page.locator('button[title="View Trash Bin"]')).toBeVisible();
    await page.getByRole("button", { name: "List", exact: true }).click();
    await expect(page.locator('button[title="View Trash Bin"]')).toBeVisible();
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await expect(page.locator('button[title="View Trash Bin"]')).toBeVisible();
  });

  test("trash has search input when items exist", async ({ page }) => {
    await createTask(page, "Searchable Trash");
    await page.locator("main").getByText("Searchable Trash").click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByPlaceholder("Search deleted tasks...")).toBeVisible({ timeout: 10000 });
  });
});
