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

  const filterOverflow = await page
    .getByTestId("tasks-filter-bar")
    .evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(filterOverflow).toBeLessThanOrEqual(1);
}

async function openTasksPage(page: Page) {
  await page.getByRole("button", { name: /^Tasks/ }).click();
  await page.waitForURL("**/tasks", { timeout: 15000 });
  await expect(page.getByTestId("tasks-filter-bar")).toBeVisible();
}

test.describe("Tasks page mobile filter layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByLabel("Email", { exact: true }).fill("test@example.com");
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/", { timeout: 30000 });
    await openTasksPage(page);
  });

  test("places a full-width search above three equal filter controls", async ({ page }) => {
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);

      const search = await box(page.getByTestId("tasks-search-input"));
      const board = await box(page.getByTestId("tasks-filter-board"));
      const priority = await box(page.getByTestId("tasks-filter-priority"));
      const sort = await box(page.getByTestId("tasks-filter-sort"));

      // Search occupies its own full-width row above the filters.
      expect(search.y + search.height).toBeLessThanOrEqual(board.y + 1);
      expect(search.width).toBeGreaterThan(board.width * 2);

      // The three filters share one row with equal widths.
      expect(Math.abs(board.y - priority.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(priority.y - sort.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(board.width - priority.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(priority.width - sort.width)).toBeLessThanOrEqual(1);
      expect(board.x).toBeLessThan(priority.x);
      expect(priority.x).toBeLessThan(sort.x);
      expect(board.x + board.width).toBeLessThanOrEqual(priority.x + 1);
      expect(priority.x + priority.width).toBeLessThanOrEqual(sort.x + 1);

      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps filter tabs in one horizontally scrollable row", async ({ page }) => {
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(200);

      const tabs = page.getByTestId("tasks-filter-tabs");
      const tabButtons = tabs.locator("button");
      const metrics = await tabs.evaluate((element) => {
        const styles = getComputedStyle(element);
        return {
          flexWrap: styles.flexWrap,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      });

      expect(metrics.flexWrap).toBe("nowrap");
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

      const rowTops = await tabButtons.evaluateAll((buttons) =>
        buttons.map((button) => Math.round(button.getBoundingClientRect().top))
      );
      expect(new Set(rowTops).size).toBe(1);

      const completedTab = tabs.getByRole("button", { name: /^Completed/ });
      await tabs.evaluate((element) => {
        element.scrollLeft = element.scrollWidth;
      });
      await expect(completedTab).toBeInViewport();
      await completedTab.click();

      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps the desktop search-and-filter toolbar on one row", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(250);

    const search = await box(page.getByTestId("tasks-search-input"));
    const board = await box(page.getByTestId("tasks-filter-board"));
    const priority = await box(page.getByTestId("tasks-filter-priority"));
    const sort = await box(page.getByTestId("tasks-filter-sort"));

    expect(Math.abs(search.y - board.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(board.y - priority.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(priority.y - sort.y)).toBeLessThanOrEqual(1);
    expect(search.x).toBeLessThan(board.x);
    expect(board.x + board.width).toBeLessThanOrEqual(priority.x + 1);
    expect(priority.x + priority.width).toBeLessThanOrEqual(sort.x + 1);
    expect(search.width).toBeGreaterThan(board.width);

    await expectNoHorizontalOverflow(page);
  });
});
