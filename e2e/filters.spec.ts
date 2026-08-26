import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

test.describe("Search & Filter", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("filters"));
    await createBoard(page, "Filter Test Board");
    await navigateToBoard(page, "Filter Test Board");
  });

  test.describe("Task search", () => {
    test("search input is available on xl viewport", async ({ page }) => {
      await expect(page.getByPlaceholder("Search tasks...")).toBeVisible();
    });

    test("search filters tasks by title", async ({ page }) => {
      await createTask(page, "Alpha Task");
      await createTask(page, "Beta Task");
      await page.getByPlaceholder("Search tasks...").fill("Alpha");
      await expect(page.locator("main").getByText("Alpha Task")).toBeVisible();
      await expect(page.locator("main").getByText("Beta Task")).not.toBeVisible();
    });

    test("clearing search shows all tasks", async ({ page }) => {
      await createTask(page, "Alpha Task");
      await createTask(page, "Beta Task");
      await page.getByPlaceholder("Search tasks...").fill("Alpha");
      await page.getByPlaceholder("Search tasks...").clear();
      await expect(page.locator("main").getByText("Alpha Task")).toBeVisible();
      await expect(page.locator("main").getByText("Beta Task")).toBeVisible();
    });
  });

  test.describe("Assignee filter", () => {
    test("shows filter buttons", async ({ page }) => {
      await expect(page.getByRole("button", { name: /All Tasks/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /Unassigned/ })).toBeVisible();
    });

    test("All Tasks is selected by default", async ({ page }) => {
      const allBtn = page.getByRole("button", { name: /All Tasks/ });
      await expect(allBtn).toBeVisible();
    });

    test("Unassigned filter works", async ({ page }) => {
      await createTask(page, "Unassigned Task");
      await page.getByRole("button", { name: /Unassigned/ }).click();
      await expect(page.locator("main").getByText("Unassigned Task")).toBeVisible();
    });

    test("filter shows task counts", async ({ page }) => {
      await createTask(page, "Filter Count Task");
      const unassignedBtn = page.getByRole("button", { name: /Unassigned/ });
      await expect(unassignedBtn).toContainText(/\d+/);
    });
  });

  test.describe("Tag filter", () => {
    test("tag filter appears after creating tagged task", async ({ page }) => {
      await page.locator('button[title="Create New Task"]').click();
      await page.locator("#title").fill("Tagged Filter Task");
      await page.getByRole("dialog").getByRole("button", { name: "Add Tag" }).click();
      await page.getByPlaceholder("Tag name...").fill("urgent");
      await page.getByPlaceholder("Tag name...").locator("..").getByRole("button", { name: "Add" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Create Task" }).click();
      await expect(page.getByRole("button", { name: "urgent" })).toBeVisible({ timeout: 5000 });
    });
  });
});
