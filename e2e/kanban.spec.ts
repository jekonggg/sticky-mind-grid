import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

const TEST_EMAIL = uniqueEmail("kanban");

test.describe("Kanban Board", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, TEST_EMAIL, "testpassword123", "Kanban User");
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

    test("shows activity sidebar", async ({ page }) => {
      await expect(page.getByText("History")).toBeVisible();
    });

    test("toggles activity sidebar", async ({ page }) => {
      await page.locator('button[title="Collapse Activity"]').click();
      await expect(page.locator('button[title="Expand Activity"]')).toBeVisible();
      await page.locator('button[title="Expand Activity"]').click();
      await expect(page.locator('button[title="Collapse Activity"]')).toBeVisible();
    });
  });

  test.describe("View tabs", () => {
    test("switches between all view tabs", async ({ page }) => {
      for (const tab of ["Overview", "List", "Calendar", "Documents", "Members"]) {
        await page.getByRole("button", { name: tab }).click();
        await expect(page.getByRole("button", { name: tab })).toHaveAttribute(
          "aria-selected",
          "true"
        );
      }
    });

    test("defaults to Board view", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Board" })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    test("returns to Board view from other tabs", async ({ page }) => {
      await page.getByRole("button", { name: "List" }).click();
      await expect(page.getByRole("heading", { name: "To Do" })).not.toBeVisible();
      await page.getByRole("button", { name: "Board" }).click();
      await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();
    });
  });

  test.describe("Task CRUD", () => {
    test("creates a task via FAB", async ({ page }) => {
      await createTask(page, "My First Task");
      await expect(page.getByText("My First Task")).toBeVisible();
    });

    test("creates task in To Do column by default", async ({ page }) => {
      await createTask(page, "Default Column Task");
      const todoColumn = page.locator("div").filter({ has: page.getByRole("heading", { name: "To Do" }) }).first();
      await expect(todoColumn.getByText("Default Column Task")).toBeVisible();
    });

    test("opens task in edit mode on click", async ({ page }) => {
      await createTask(page, "Clickable Task");
      await page.getByText("Clickable Task").click();
      await expect(page.getByRole("heading", { name: "Edit Task" })).toBeVisible();
      await expect(page.locator("#title")).toHaveValue("Clickable Task");
    });

    test("edits task title", async ({ page }) => {
      await createTask(page, "Old Title");
      await page.getByText("Old Title").click();
      await page.locator("#title").clear();
      await page.locator("#title").fill("New Title");
      await page.getByRole("dialog").getByRole("button", { name: "Update Task" }).click();
      await expect(page.getByText("New Title")).toBeVisible();
      await expect(page.getByText("Old Title")).not.toBeVisible();
    });

    test("deletes a task (soft delete)", async ({ page }) => {
      await createTask(page, "Delete Me");
      await page.getByText("Delete Me").click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete Task" }).click();
      await expect(page.getByText("Delete Me")).not.toBeVisible({ timeout: 5000 });
    });

    test("creates multiple tasks", async ({ page }) => {
      await createTask(page, "Task Alpha");
      await createTask(page, "Task Beta");
      await createTask(page, "Task Gamma");
      await expect(page.getByText("Task Alpha")).toBeVisible();
      await expect(page.getByText("Task Beta")).toBeVisible();
      await expect(page.getByText("Task Gamma")).toBeVisible();
    });
  });

  test.describe("Task fields", () => {
    test("sets task priority", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').click();
      await page.locator("#title").fill("High Priority Task");
      await page.getByRole("dialog").getByRole("button", { name: "high" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
      await expect(page.getByText("high").first()).toBeVisible();
    });

    test("sets task description", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').click();
      await page.locator("#title").fill("Described Task");
      await page.locator("#description").fill("This is a detailed description");
      await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
      await page.getByText("Described Task").click();
      await expect(page.locator("#description")).toHaveValue("This is a detailed description");
    });

    test("sets task due date", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').click();
      await page.locator("#title").fill("Dated Task");
      await page.locator("#due-date").fill("2026-12-25T10:00");
      await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
      await page.getByText("Dated Task").click();
      await expect(page.locator("#due-date")).toHaveValue("2026-12-25T10:00");
    });

    test("sets task progress", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').click();
      await page.locator("#title").fill("Progress Task");
      await page.getByRole("dialog").getByRole("button", { name: "70%" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
      await page.getByText("Progress Task").click();
      await expect(page.getByRole("dialog").getByRole("button", { name: "70%" })).toHaveAttribute("data-state", "active");
    });

    test("adds a tag to a task", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').click();
      await page.locator("#title").fill("Tagged Task");
      await page.getByRole("dialog").getByRole("button", { name: "Add Tag" }).click();
      await page.getByPlaceholder("Tag name...").fill("bug");
      await page.getByRole("dialog").getByRole("button", { name: "Add", exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
      await expect(page.getByText("bug").first()).toBeVisible();
    });

    test("adds checklist items", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').click();
      await page.locator("#title").fill("Checklist Task");
      await page.getByPlaceholder("Add a subtask...").fill("Subtask 1");
      await page.getByPlaceholder("Add a subtask...").press("Enter");
      await page.getByPlaceholder("Add a subtask...").fill("Subtask 2");
      await page.getByPlaceholder("Add a subtask...").press("Enter");
      await expect(page.getByText("Subtask 1")).toBeVisible();
      await expect(page.getByText("Subtask 2")).toBeVisible();
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
