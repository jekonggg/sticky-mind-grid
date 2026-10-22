import { test, expect, type Page } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

async function loginSeededUser(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/", { timeout: 30000 });
}

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
    await page.getByTestId("task-header-more-actions").click();
    await page.getByRole("menuitem", { name: "Move to Trash" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByRole("dialog").getByText("To Be Trashed")).toBeVisible({ timeout: 10000 });
  });

  test("restores a task from trash", async ({ page }) => {
    await createTask(page, "Restore Me");
    await page.locator("main").getByText("Restore Me").click();
    await page.getByTestId("task-header-more-actions").click();
    await page.getByRole("menuitem", { name: "Move to Trash" }).click();
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
    await page.getByTestId("task-header-more-actions").click();
    await page.getByRole("menuitem", { name: "Move to Trash" }).click();
    await page.locator('button[title="View Trash Bin"]').click();
    await expect(page.getByPlaceholder("Search deleted tasks...")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Mobile trash access", () => {
  test("moves trash into board actions and opens a mobile popup", async ({ page }) => {
    await loginSeededUser(page);
    const boardLink = page.getByRole("link", {
      name: "Open board Platform Engine - Road Map",
    });
    await expect(boardLink).toBeVisible({ timeout: 15000 });
    await boardLink.click();
    await page.waitForURL(/\/boards\/[^?]+$/, { timeout: 15000 });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await expect(page.getByTestId("board-mobile-actions")).toBeVisible();

    await expect(page.locator('button[title="View Trash Bin"]')).toBeHidden();
    await page.getByTestId("board-mobile-actions").click();
    const trashItem = page.getByTestId("board-mobile-trash");
    await expect(trashItem).toBeVisible();
    await expect(trashItem).toContainText("Trash");
    await trashItem.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: /Trash Bin/ })).toBeVisible();
    await page.waitForTimeout(250);

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThan(0);
      expect(box.y).toBeGreaterThan(0);
      expect(box.width).toBeLessThanOrEqual(390 - 16);
      expect(box.height).toBeLessThan(844 - 8);
    }

    await dialog.getByRole("button", { name: "Close" }).first().click();
    await expect(dialog).not.toBeVisible();

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(250);
    await expect(page.locator('button[title="View Trash Bin"]')).toBeVisible();
    await expect(page.getByTestId("board-mobile-actions")).toBeHidden();
  });
});
