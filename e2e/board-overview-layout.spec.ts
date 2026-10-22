import { test, expect, type Locator, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "Expected element to have bounds").not.toBeNull();
  return bounds!;
}

async function expectNoHorizontalOverflow(page: Page) {
  const documentOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(documentOverflow).toBeLessThanOrEqual(1);
}

async function signInWithSeededUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/", { timeout: 30000 });
}

async function openShowcaseOverview(page: Page) {
  // Use in-app navigation: a full reload currently revalidates the seeded legacy
  // account through the auth flow, which is outside this layout-focused spec.
  await page
    .getByRole("link", { name: "Open board Showcase: Sticky Mind Grid Core" })
    .click({ timeout: 15000 });
  await page.waitForURL(/\/boards\/board-showcase/, { timeout: 15000 });
  await page.getByRole("tab", { name: "Analytics", exact: true }).click();
  await page.waitForURL(/view=overview/, { timeout: 15000 });
  await expect(page.getByTestId("board-overview-progress")).toBeVisible({
    timeout: 15000,
  });
}

test.describe("Board Overview responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await signInWithSeededUser(page);
    await openShowcaseOverview(page);
  });

  test("puts progress full-width above a two-column stat grid on mobile", async ({
    page,
  }) => {
    for (const width of [320, 375, 414]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);

      const progress = await box(page.getByTestId("board-overview-progress"));
      const stats = await box(page.getByTestId("board-overview-stats"));

      // Progress spans the full content width and sits above the stat cards.
      expect(Math.abs(progress.width - stats.width)).toBeLessThanOrEqual(3);
      expect(progress.y + progress.height).toBeLessThanOrEqual(stats.y + 1);

      // The stat cards flow two per row.
      const cards = page.getByTestId("board-overview-stat-card");
      const first = await box(cards.nth(0));
      const second = await box(cards.nth(1));
      const third = await box(cards.nth(2));
      expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
      expect(first.x).toBeLessThan(second.x);
      expect(third.y).toBeGreaterThan(first.y);
      expect(Math.abs(first.width - second.width)).toBeLessThanOrEqual(2);

      await expect(page.getByText("Total Tasks", { exact: true })).toBeVisible();
      await expect(page.getByText("Overall Progress", { exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("keeps stats above progress on tablet and desktop", async ({ page }) => {
    for (const width of [768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);

      const progress = await box(page.getByTestId("board-overview-progress"));
      const stats = await box(page.getByTestId("board-overview-stats"));
      expect(stats.y).toBeLessThan(progress.y);
      await expectNoHorizontalOverflow(page);
    }
  });
});
