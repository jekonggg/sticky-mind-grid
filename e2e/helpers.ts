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
}

export async function createTask(page: Page, title: string) {
  await page.locator('button[title="Create New Task"]').click();
  await page.locator("#title").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#title").fill(title);
  await page.waitForTimeout(700); // Allow debounced auto-save
  const closeBtn = page.locator('button[title="Close task (Esc)"]').or(page.getByRole("button", { name: "Board", exact: true })).first();
  await closeBtn.click();
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
