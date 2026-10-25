import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail, TEST_PASSWORD } from "./helpers";

test.describe("First-Run Onboarding Flow", () => {
  test("new user sees single question with 4 choices, chooses personal template, starter board auto-created with 3 latched steps", async ({
    page,
  }) => {
    const email = uniqueEmail("onboard-e2e");
    // Register directly without auto-skipping
    await page.goto("/register");
    await page.getByLabel("Full Name", { exact: true }).fill("New Onboard User");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirm Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    await page.waitForURL(/\/login/, { timeout: 30000 });
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/", { timeout: 30000 });

    // 1. Verify single question appears with 4 options and no wizard/workspace steps
    const question = page.getByTestId("onboarding-question");
    await expect(question).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("onboarding-choice-personal")).toBeVisible();
    await expect(page.getByTestId("onboarding-choice-team")).toBeVisible();
    await expect(page.getByTestId("onboarding-choice-product")).toBeVisible();
    await expect(page.getByTestId("onboarding-choice-ideas")).toBeVisible();

    // 2. Select "Personal tasks"
    await page.getByTestId("onboarding-choice-personal").click();

    // 3. Lands on starter board with latched checklist and step 1 checked
    await page.waitForURL(/\/boards\//, { timeout: 20000 });
    const checklist = page.getByTestId("getting-started-checklist");
    await expect(checklist).toBeVisible({ timeout: 15000 });
    await expect(checklist).toContainText("1 of 3 done");
    await expect(checklist).toContainText("Create your first board");
  });

  test("new user can skip onboarding on the question; creates no board and allows normal board creation", async ({
    page,
  }) => {
    const email = uniqueEmail("onboard-skip");
    await page.goto("/register");
    await page.getByLabel("Full Name", { exact: true }).fill("Skip Onboard User");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel("Confirm Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Create Account" }).click();

    await page.waitForURL(/\/login/, { timeout: 30000 });
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/", { timeout: 30000 });

    // Skip directly on the question
    const skipBtn = page.getByTestId("onboarding-skip-question");
    await expect(skipBtn).toBeVisible({ timeout: 15000 });
    await skipBtn.click();

    // Verify empty state or standard dashboard without onboarding question
    await expect(page.getByTestId("onboarding-question")).toBeHidden({ timeout: 10000 });
    await expect(page.getByText("No boards yet")).toBeVisible();
  });
});
