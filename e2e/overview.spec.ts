import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  createTask,
  uniqueEmail,
} from "./helpers";

const TEST_EMAIL = uniqueEmail("overview");

test.describe("Board Overview", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, TEST_EMAIL);
    await createBoard(page, "Overview Test Board");
    await navigateToBoard(page, "Overview Test Board");
    await page.getByRole("button", { name: "Overview" }).click();
  });

  test("shows Total Tasks stat", async ({ page }) => {
    await expect(page.getByText("Total Tasks")).toBeVisible();
  });

  test("shows progress section", async ({ page }) => {
    await expect(page.getByText("Overall Progress")).toBeVisible();
    await expect(page.getByText("Weighted completion across all tasks")).toBeVisible();
  });

  test("shows progress percentage", async ({ page }) => {
    await expect(page.locator("span.text-4xl")).toBeVisible();
  });

  test("shows started date", async ({ page }) => {
    await expect(page.getByText("Started")).toBeVisible();
  });

  test("shows last updated date", async ({ page }) => {
    await expect(page.getByText("Last Updated")).toBeVisible();
  });

  test("shows 0 tasks when board is empty", async ({ page }) => {
    const statCards = page.locator("h3.text-3xl");
    await expect(statCards.first()).toHaveText("0");
  });

  test("updates task count after creating task", async ({ page }) => {
    await page.getByRole("button", { name: "Board" }).click();
    await createTask(page, "Count Task");
    await page.getByRole("button", { name: "Overview" }).click();
    await expect(page.locator("h3.text-3xl").first()).toHaveText("1");
  });
});
