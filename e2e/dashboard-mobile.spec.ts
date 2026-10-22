import { test, expect, type Locator, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, `Expected ${await locator.getAttribute("data-testid")} to have bounds`).not.toBeNull();
  return bounds!;
}

async function expectNoHorizontalOverflow(page: Page) {
  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(documentOverflow).toBeLessThanOrEqual(1);

  const contentOverflow = await page
    .getByTestId("dashboard-content")
    .evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(contentOverflow).toBeLessThanOrEqual(1);

  for (const id of [
    "dashboard-active-tasks",
    "dashboard-summary-completed",
    "dashboard-summary-overdue",
    "dashboard-summary-boards",
    "dashboard-priority-tasks",
    "dashboard-upcoming-deadlines",
    "dashboard-audit-stream",
  ]) {
    const overflow = await page
      .getByTestId(id)
      .evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow, `${id} should not overflow horizontally`).toBeLessThanOrEqual(1);
  }
}

async function openDashboard(page: Page) {
  // Use in-app navigation: a full reload currently revalidates the seeded legacy
  // account through the auth flow, which is outside this layout-focused spec.
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page.getByTestId("dashboard-active-tasks")).toBeVisible();
  await expect(page.getByText("Workspace Audit Stream", { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function signInWithSeededUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/", { timeout: 30000 });
}

test.describe("Mobile dashboard bento layout", () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeededUser(page);
    await openDashboard(page);
  });

  test("keeps the active card and summary rail in the intended mobile grid", async ({
    page,
  }) => {
    for (const width of [375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);

      await expect(page.getByText("Active Tasks", { exact: true })).toBeVisible();
      await expect(page.getByText("Completed", { exact: true })).toBeVisible();
      await expect(page.getByText("Overdue", { exact: true })).toBeVisible();
      await expect(page.getByText("Total Boards", { exact: true })).toBeVisible();
      await expect(page.getByText(/My Priority Tasks/)).toBeVisible();
      await expect(page.getByText("Upcoming Deadlines", { exact: true })).toBeVisible();
      await expect(page.getByText("Workspace Audit Stream", { exact: true })).toBeVisible();
      const calendarAction = page.getByRole("button", { name: "Open calendar" });
      await expect(calendarAction).toBeVisible();
      await expect(calendarAction).toHaveText("Calendar →");
      await expect(calendarAction.locator("svg")).toHaveCount(0);

      const active = await box(page.getByTestId("dashboard-active-tasks"));
      const completed = await box(page.getByTestId("dashboard-summary-completed"));
      const overdue = await box(page.getByTestId("dashboard-summary-overdue"));
      const boards = await box(page.getByTestId("dashboard-summary-boards"));
      const priority = await box(page.getByTestId("dashboard-priority-tasks"));
      const deadlines = await box(page.getByTestId("dashboard-upcoming-deadlines"));
      const audit = await box(page.getByTestId("dashboard-audit-stream"));

      // Active card occupies the left ~2/3, summary cards stack on the right.
      expect(active.x).toBeLessThan(completed.x);
      expect(active.x + active.width).toBeLessThanOrEqual(completed.x + 1);
      expect(active.width).toBeGreaterThan(completed.width * 1.5);
      expect(Math.abs(completed.y - active.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(completed.x - overdue.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(overdue.x - boards.x)).toBeLessThanOrEqual(1);
      expect(completed.y).toBeLessThan(overdue.y);
      expect(overdue.y).toBeLessThan(boards.y);
      expect(boards.y + boards.height).toBeLessThanOrEqual(active.y + active.height + 1);

      // Priority and deadlines sit beside each other, audit spans below both.
      expect(priority.x).toBeLessThan(deadlines.x);
      expect(Math.abs(priority.y - deadlines.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(priority.width - deadlines.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(priority.height - deadlines.height)).toBeLessThanOrEqual(2);
      expect(priority.x + priority.width).toBeLessThanOrEqual(deadlines.x + 1);

      const priorityItem = page.getByTestId("priority-task-item").first();
      await expect(priorityItem.getByTestId("priority-task-due-date")).toBeHidden();
      await expect(priorityItem.getByTestId("priority-task-priority-dot")).toBeVisible();
      await expect(priorityItem.getByTestId("priority-task-priority-badge")).toBeHidden();

      const upcomingItem = page.getByTestId("upcoming-task-item").first();
      await expect(upcomingItem).not.toContainText("📌");
      await expect(upcomingItem.locator("svg")).toHaveCount(0);
      expect(audit.y).toBeGreaterThanOrEqual(
        Math.max(priority.y + priority.height, deadlines.y + deadlines.height) - 1
      );
      expect(Math.abs(audit.x - priority.x)).toBeLessThanOrEqual(1);
      expect(audit.width).toBeGreaterThan(priority.width);
      expect(audit.width).toBeGreaterThan(deadlines.width);

      await expectNoHorizontalOverflow(page);
    }

    // Preserved navigation: the active-tasks card still opens the task list.
    await page.setViewportSize({ width: 375, height: 900 });
    await page.getByTestId("dashboard-active-tasks").click();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test("stacks the second row on a 320px screen without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.waitForTimeout(200);

    const active = await box(page.getByTestId("dashboard-active-tasks"));
    const completed = await box(page.getByTestId("dashboard-summary-completed"));
    const overdue = await box(page.getByTestId("dashboard-summary-overdue"));
    const boards = await box(page.getByTestId("dashboard-summary-boards"));
    const priority = await box(page.getByTestId("dashboard-priority-tasks"));
    const deadlines = await box(page.getByTestId("dashboard-upcoming-deadlines"));
    const audit = await box(page.getByTestId("dashboard-audit-stream"));

    // The top bento still keeps the summary rail on the right.
    expect(active.x).toBeLessThan(completed.x);
    expect(Math.abs(completed.x - overdue.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(overdue.x - boards.x)).toBeLessThanOrEqual(1);
    expect(completed.y).toBeLessThan(overdue.y);
    expect(overdue.y).toBeLessThan(boards.y);

    // The lower row stacks vertically at the narrowest supported width.
    expect(deadlines.y).toBeGreaterThanOrEqual(priority.y + priority.height - 1);
    expect(audit.y).toBeGreaterThanOrEqual(deadlines.y + deadlines.height - 1);
    expect(Math.abs(audit.x - priority.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(audit.width - priority.width)).toBeLessThanOrEqual(1);

    await expectNoHorizontalOverflow(page);
  });

  test("opens New Board as a compact popup instead of a full-screen page", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.getByRole("button", { name: "New Board", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Create Board" });
    await expect(dialog).toBeVisible();

    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeLessThan(375 - 16);
    expect(bounds!.height).toBeLessThan(900 - 16);
    expect(bounds!.x).toBeGreaterThan(0);
    expect(bounds!.y).toBeGreaterThan(0);
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("uses separate scratchpad list and editor pages on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 900 });
    await page.getByRole("button", { name: "Scratchpad", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Scratchpad" });
    const noteList = dialog.getByTestId("scratchpad-note-list");
    const editor = dialog.getByTestId("scratchpad-note-editor");

    await expect(dialog.getByRole("heading", { name: "Scratchpad" })).toBeVisible();
    await expect(noteList).toBeVisible();
    await expect(editor).toBeHidden();
    await expect(dialog.getByPlaceholder("Search notes...")).toBeVisible();

    await noteList.getByRole("button").first().click();

    await expect(editor).toBeVisible();
    await expect(noteList).toBeHidden();
    await expect(dialog.getByPlaceholder("Note Title...")).toBeVisible();

    const toolbar = dialog.getByTestId("scratchpad-format-toolbar");
    await expect(toolbar).toHaveAttribute("data-placement", "bottom");
    for (const name of [
      "Bold",
      "Italic",
      "Underline",
      "Strikethrough",
      "Bulleted list",
      "Numbered list",
      "Checklist",
      "Align left",
      "Align center",
      "Align right",
      "Justify",
    ]) {
      await expect(toolbar.getByRole("button", { name })).toBeVisible();
    }
    await expect(toolbar.getByLabel("Font size")).toBeVisible();
    await expect(toolbar.getByLabel("Text color")).toBeVisible();
    await expect(dialog.getByTestId("scratchpad-content-editor")).toBeVisible();

    await dialog.getByRole("button", { name: "Back to notes" }).click();

    await expect(noteList).toBeVisible();
    await expect(editor).toBeHidden();
  });

  test("preserves the desktop 7/5 dashboard arrangement", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(250);

    const active = await box(page.getByTestId("dashboard-active-tasks"));
    const completed = await box(page.getByTestId("dashboard-summary-completed"));
    const boards = await box(page.getByTestId("dashboard-summary-boards"));
    const overdue = await box(page.getByTestId("dashboard-summary-overdue"));
    const priority = await box(page.getByTestId("dashboard-priority-tasks"));
    const deadlines = await box(page.getByTestId("dashboard-upcoming-deadlines"));
    const audit = await box(page.getByTestId("dashboard-audit-stream"));

    // Top telemetry remains a single row: active/completed left, boards/overdue right.
    expect(Math.abs(active.y - completed.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(completed.y - boards.y)).toBeLessThanOrEqual(2);
    expect(active.x).toBeLessThan(completed.x);
    expect(completed.x + completed.width).toBeLessThanOrEqual(boards.x + 1);
    expect(boards.x).toBeLessThan(overdue.x);
    expect(Math.abs(active.y - overdue.y)).toBeLessThanOrEqual(2);

    // Priority stays in the left column, deadlines and audit in the right rail.
    expect(deadlines.x).toBeGreaterThan(priority.x + priority.width - 1);
    expect(audit.x).toBeGreaterThan(priority.x + priority.width - 1);
    expect(audit.y).toBeGreaterThanOrEqual(deadlines.y + deadlines.height - 1);
    expect(audit.width).toBeLessThan(priority.width);

    await expectNoHorizontalOverflow(page);
  });
});
