import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

const TEST_EMAIL = uniqueEmail("documents");

test.describe("Documents View", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, TEST_EMAIL);
    await createBoard(page, "Docs Test Board");
    await navigateToBoard(page, "Docs Test Board");
    await page.getByRole("button", { name: "Documents" }).click();
  });

  test("shows Project Hub heading", async ({ page }) => {
    await expect(page.getByText("Project Hub")).toBeVisible();
  });

  test("shows notes section", async ({ page }) => {
    await expect(page.getByText(/Project Notes & Documentation/)).toBeVisible();
  });

  test("shows task assets section", async ({ page }) => {
    await expect(page.getByText(/Task Assets & Files/)).toBeVisible();
  });

  test("shows new note button", async ({ page }) => {
    await expect(page.getByRole("button", { name: "New Note" })).toBeVisible();
  });

  test("shows search input", async ({ page }) => {
    await expect(page.getByPlaceholder("Search notes & assets...")).toBeVisible();
  });

  test("shows empty notes state", async ({ page }) => {
    await expect(page.getByText("No notes created yet")).toBeVisible();
  });

  test("shows empty assets state", async ({ page }) => {
    await expect(page.getByText("No task attachments found")).toBeVisible();
  });

  test("creates a new note", async ({ page }) => {
    await page.getByRole("button", { name: "New Note" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
