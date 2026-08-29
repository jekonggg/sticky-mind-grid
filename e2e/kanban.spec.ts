import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

test.describe("Kanban Board", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("kanban"), "testpassword123", "Kanban User");
    await createBoard(page, "Kanban Board", "Board for kanban tests");
    await navigateToBoard(page, "Kanban Board");
  });

  test.describe("Board layout", () => {
    test("displays board with default columns", async ({ page }) => {
      await expect(page.locator("h1").filter({ hasText: "Kanban Board" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "In Progress" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();
    });

    test("shows role badge", async ({ page }) => {
      await expect(page.getByText("Owner")).toBeVisible();
    });

    test("shows empty columns with 'No tasks'", async ({ page }) => {
      await expect(page.getByText("No tasks").first()).toBeVisible();
    });

    test("shows on-demand activity history in header", async ({ page }) => {
      await page.locator('button[title="Activity History"]').click();
      await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
    });
  });

  test.describe("View tabs", () => {
    test("switches between all view tabs", async ({ page }) => {
      for (const tab of ["Overview", "List", "Calendar", "Documents", "Members"]) {
        await page.getByRole("button", { name: tab, exact: true }).click();
        await expect(page.getByRole("button", { name: tab, exact: true })).toHaveAttribute(
          "aria-selected",
          "true"
        );
      }
    });

    test("defaults to Board view", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Board", exact: true })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    test("returns to Board view from other tabs", async ({ page }) => {
      await page.getByRole("button", { name: "List", exact: true }).click();
      await expect(page.getByRole("heading", { name: "To Do" })).not.toBeVisible();
      await page.getByRole("button", { name: "Board", exact: true }).click();
      await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();
    });
  });

  test.describe("Task CRUD & Right-Side Notion Workspace", () => {
    test("creates a task via FAB and opens right-side workspace", async ({ page }) => {
      await createTask(page, "My First Task");
      await expect(page.locator("main").getByText("My First Task")).toBeVisible();
    });

    test("creates task in To Do column by default", async ({ page }) => {
      await createTask(page, "Default Column Task");
      const todoColumn = page.locator(".group\\/column").filter({ has: page.getByRole("heading", { name: "To Do" }) }).first();
      await expect(todoColumn.getByRole("heading", { name: "Default Column Task" })).toBeVisible();
    });

    test("opens task in right-side workspace on click while keeping board visible", async ({ page }) => {
      await createTask(page, "Clickable Task");
      await page.locator("main").getByText("Clickable Task").click();
      await expect(page.locator("#title")).toHaveValue("Clickable Task");
      // Board columns remain visible on screen
      await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "In Progress" })).toBeVisible();
      // Right-side properties visible
      await expect(page.getByText("Status")).toBeVisible();
      await expect(page.getByText("Priority")).toBeVisible();
      await expect(page.getByText("Assignee")).toBeVisible();
      await expect(page.getByText("Due Date")).toBeVisible();
    });

    test("edits task title in right-side workspace", async ({ page }) => {
      await createTask(page, "Old Title");
      await page.locator("main").getByText("Old Title").click();
      await page.locator("#title").fill("New Title");
      await page.locator("#title").blur();
      await page.waitForTimeout(500);
      const closeBtn = page.locator('button[title="Close task (Esc)"]').first();
      await closeBtn.click();
      await expect(page.locator("main").getByText("New Title")).toBeVisible();
      await expect(page.locator("main").getByText("Old Title")).not.toBeVisible();
    });

    test("deletes a task from right-side workspace (soft delete)", async ({ page }) => {
      await createTask(page, "Delete Me");
      await page.locator("main").getByText("Delete Me").click();
      await page.getByRole("button", { name: "Delete Task" }).click();
      await expect(page.locator("main").getByText("Delete Me")).not.toBeVisible({ timeout: 5000 });
    });

    test("creates multiple tasks", async ({ page }) => {
      await createTask(page, "Task Alpha");
      await createTask(page, "Task Beta");
      await createTask(page, "Task Gamma");
      await expect(page.locator("main").getByText("Task Alpha")).toBeVisible();
      await expect(page.locator("main").getByText("Task Beta")).toBeVisible();
      await expect(page.locator("main").getByText("Task Gamma")).toBeVisible();
    });
  });

  test.describe("Task fields in Right-Side Workspace", () => {
    test("sets task description in workspace", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').dispatchEvent("click");
      await page.locator("#title").waitFor({ state: "visible", timeout: 15000 });
      await page.locator("#title").fill("Described Task");
      await page.locator("#description").fill("This is a detailed description in Notion workspace");
      await page.waitForTimeout(900);
      const closeBtn = page.locator('button[title="Close task (Esc)"]').or(page.getByRole("button", { name: "Board", exact: true })).first();
      await closeBtn.click();
      await page.locator("main").getByText("Described Task").click();
      await expect(page.locator("#description")).toHaveValue("This is a detailed description in Notion workspace");
    });

    test("adds checklist items in Notion workspace", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').dispatchEvent("click");
      await page.locator("#title").waitFor({ state: "visible", timeout: 15000 });
      await page.locator("#title").fill("Checklist Task");
      await page.getByPlaceholder(/add a subtask/i).fill("Subtask 1");
      await page.getByPlaceholder(/add a subtask/i).press("Enter");
      await expect(page.getByTestId("checklist-item-input")).toHaveCount(1);
      await page.getByPlaceholder(/add a subtask/i).fill("Subtask 2");
      await page.getByPlaceholder(/add a subtask/i).press("Enter");
      await expect(page.getByTestId("checklist-item-input")).toHaveCount(2);
      await expect(page.getByTestId("checklist-item-input").nth(0)).toHaveValue("Subtask 1");
      await expect(page.getByTestId("checklist-item-input").nth(1)).toHaveValue("Subtask 2");
    });
  });

  test.describe("User menu", () => {
    test("opens user menu with options", async ({ page }) => {
      await page.getByRole("button", { name: /user menu/i }).click();
      await expect(page.getByRole("menuitem", { name: /log out/i })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /all settings/i })).toBeVisible();
      await expect(page.getByRole("menuitem", { name: /my boards/i })).toBeVisible();
    });

    test("navigates to boards via menu", async ({ page }) => {
      await page.getByRole("button", { name: /user menu/i }).click();
      await page.getByRole("menuitem", { name: /my boards/i }).click();
      await expect(page).toHaveURL("/");
    });
  });
});
