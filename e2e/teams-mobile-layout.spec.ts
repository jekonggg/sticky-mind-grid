import { test, expect, type Page } from "@playwright/test";

async function loginSeededUser(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/", { timeout: 30000 });
}

test.describe("Teams mobile layout", () => {
  test("shows workspace boards in a two-column grid without overflow", async ({
    page,
  }) => {
    await loginSeededUser(page);
    await page
      .locator("aside")
      .getByRole("button", { name: /^Teams/ })
      .click();
    await page.waitForURL("/teams");

    const grid = page.getByTestId("workspace-boards-grid");
    await expect(grid).toBeVisible();

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);

      const columns = await grid.evaluate((element) => {
        const template = window.getComputedStyle(element).gridTemplateColumns;
        return template.split(" ").filter(Boolean).length;
      });
      expect(columns).toBe(2);

      const cards = grid.locator(":scope > div");
      expect(await cards.count()).toBeGreaterThanOrEqual(2);

      const firstCard = await cards.nth(0).boundingBox();
      const secondCard = await cards.nth(1).boundingBox();
      expect(firstCard).not.toBeNull();
      expect(secondCard).not.toBeNull();
      if (!firstCard || !secondCard) return;

      expect(Math.abs(firstCard.y - secondCard.y)).toBeLessThanOrEqual(1);
      expect(secondCard.x).toBeGreaterThan(firstCard.x);
      expect(secondCard.x + secondCard.width).toBeLessThanOrEqual(width + 1);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
