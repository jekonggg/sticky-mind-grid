import { type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = "http://localhost:5173";

export async function registerUser(
  page: Page,
  email: string,
  password = "testpassword123",
  fullName = "E2E Test User"
) {
  await page.goto(`${BASE_URL}/register`);
  await page.getByLabel("Full Name").fill(fullName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL("/", { timeout: 30000 });
}

export async function createBoard(page: Page, name: string, description = "") {
  await page.getByRole("button", { name: /create board/i }).first().click();
  await page.getByPlaceholder("Project or Board name…").fill(name);
  if (description) {
    await page.getByPlaceholder("What is this board for?").fill(description);
  }
  await page.getByRole("dialog").getByRole("button", { name: "Create Board" }).click();
  await expectToast(page, /created/);
}

export async function navigateToBoard(page: Page, boardName: string) {
  await page.locator(".grid").getByRole("heading", { name: boardName }).first().click();
  await page.waitForURL(/\/boards\//, { timeout: 15000 });
  await page.locator("h1").filter({ hasText: boardName }).waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("heading", { name: "To Do" }).waitFor({ state: "visible", timeout: 15000 });
}

export async function createTask(page: Page, title: string) {
  // Ensure board columns are rendered
  await page.getByRole("heading", { name: "To Do" }).waitFor({ state: "visible", timeout: 15000 });

  // If a task workspace is already open, close it first
  const existingCloseBtn = page.locator('button[title="Close task (Esc)"]').first();
  if (await existingCloseBtn.isVisible()) {
    await existingCloseBtn.click();
    await page.waitForTimeout(300);
  }

  const fab = page.locator('button[title="Create New Task"]');
  await fab.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(200);
  await fab.dispatchEvent("click");

  const titleInput = page.locator("#title");
  await titleInput.waitFor({ state: "visible", timeout: 15000 });
  await titleInput.fill(title);
  await titleInput.blur();
  await page.waitForTimeout(500); // Allow debounced auto-save
  const closeBtn = page.locator('button[title="Close task (Esc)"]').first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(300);
  }
}

export async function expectToast(page: Page, pattern: RegExp, timeout = 10000) {
  await page
    .locator("[data-sonner-toast], [data-sonner-toast-id], li[role=status]")
    .filter({ hasText: pattern })
    .first()
    .waitFor({ state: "visible", timeout });
}

export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`;
}

export async function setupBoardWithTask(page: Page) {
  const email = uniqueEmail();
  await registerUser(page, email, "testpassword123", "Board Test User");
  await createBoard(page, "Test Board", "A board for testing");
  await navigateToBoard(page, "Test Board");
  await createTask(page, "Sample Task");
  return { email };
}
