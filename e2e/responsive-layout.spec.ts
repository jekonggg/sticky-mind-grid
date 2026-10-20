import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  createBoard,
  createTask,
  navigateToBoard,
  registerUser,
  uniqueEmail,
} from "./helpers";

async function expectSingleLine(locator: Locator) {
  const metrics = await locator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize) || 16;
    const lineHeight =
      style.lineHeight === "normal"
        ? fontSize * 1.2
        : Number.parseFloat(style.lineHeight) || fontSize * 1.2;
    return {
      height: element.getBoundingClientRect().height,
      lineHeight,
    };
  });

  expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight * 1.6);
}

async function expectNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("Responsive board header layout", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("responsive"), undefined, "Responsive User");
    await createBoard(page, "Responsive Board", "Responsive layout coverage");
    await navigateToBoard(page, "Responsive Board");
    await createTask(page, "Responsive Task");
  });

  test("moves all board views into the mobile header and removes the bottom dock", async ({
    page,
  }) => {
    for (const width of [320, 375]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(200);

      const rail = page.getByTestId("board-view-rail");
      await expect(rail).toBeVisible();
      await expect(rail).toHaveAttribute("aria-label", "Board views");
      await expect(page.getByTestId("board-desktop-dock")).toBeHidden();

      const tabs = rail.locator("button");
      await expect(tabs).toHaveCount(6);

      for (let index = 0; index < 6; index += 1) {
        const tab = tabs.nth(index);
        const box = await tab.boundingBox();
        expect(box, `view tab ${index} should have a box`).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        await expect(tab).toHaveText("");
      }

      await expect(page.getByRole("button", { name: "Add task", exact: true })).toBeVisible();
      await expectNoPageOverflow(page);

      if (width === 320) {
        await page.getByTestId("board-mobile-actions").click();
        await expect(page.getByRole("menuitem", { name: /Edit board & icon/i })).toBeVisible();
        await expect(page.getByRole("menuitem", { name: /Mute board/i })).toBeVisible();
        await page.keyboard.press("Escape");

        await page.getByRole("button", { name: "List", exact: true }).click();
        await expect(page).toHaveURL(/\/boards\/.*[?&]view=list/);
        await expect(rail).toBeVisible();
        await expect(page.getByRole("button", { name: "List", exact: true })).toHaveAttribute(
          "aria-current",
          "page"
        );
        await expect(page.getByText("Responsive Task", { exact: true }).filter({ visible: true }).first()).toBeVisible();
        await page.getByRole("button", { name: "Board", exact: true }).click();
        await expect(page).toHaveURL(/\/boards\/[^?]+$/);
        await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();

        await page.getByRole("button", { name: "Calendar", exact: true }).click();
        await expect(page.getByRole("button", { name: "Calendar", exact: true })).toHaveAttribute(
          "aria-current",
          "page"
        );
        await expect(page.getByRole("heading", { name: /October \d{4}/ })).toBeVisible();

        await page.getByRole("button", { name: "Docs & Files", exact: true }).click();
        await expect(page.getByRole("heading", { name: /Project Hub/i })).toBeVisible();

        await page.getByRole("button", { name: "Analytics", exact: true }).click();
        await expect(page.getByText("Total Tasks", { exact: true })).toBeVisible();

        await page.getByRole("button", { name: "Team", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Board Members", exact: true })).toBeVisible();

        await page.getByRole("button", { name: "Board", exact: true }).click();
        await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();
      }
    }

    await page.getByRole("button", { name: "Add task", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("task detail breadcrumb and actions do not overlap on a 320px screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.waitForTimeout(200);

    await page.locator("main").getByText("Responsive Task").first().click();
    await expect(page.locator("#title")).toBeVisible();

    const breadcrumb = page.getByRole("navigation", { name: "Task breadcrumb" });
    const actions = page.getByTestId("task-header-actions");
    await expect(breadcrumb).toBeVisible();
    await expect(actions).toBeVisible();
    // Let the right-side drawer finish its slide-in before measuring layout.
    await page.waitForTimeout(350);

    const headerLayout = await page.evaluate(() => {
      const nav = document.querySelector('[aria-label="Task breadcrumb"]')!;
      const actionStrip = document.querySelector('[data-testid="task-header-actions"]')!;
      const navRect = nav.getBoundingClientRect();
      const actionsRect = actionStrip.getBoundingClientRect();
      return {
        breadcrumbRight: navRect.right,
        actionsLeft: actionsRect.left,
        viewportWidth: window.innerWidth,
      };
    });

    expect(headerLayout.breadcrumbRight).toBeLessThanOrEqual(
      headerLayout.actionsLeft + 1
    );
    expect(headerLayout.actionsLeft).toBeGreaterThan(0);
    expect(headerLayout.actionsLeft).toBeLessThan(headerLayout.viewportWidth);

    const mobileActions = page.getByTestId("task-header-mobile-actions");
    await expect(mobileActions).toBeVisible();
    await mobileActions.click();
    await expect(page.getByRole("menuitem", { name: "Copy task link" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.locator('button[title="Close task (Esc)"]').first().click();
  });

  test("keeps the desktop view pill and fixes wrapping at tablet and laptop widths", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.waitForTimeout(200);

    await expect(page.getByTestId("board-view-rail")).toBeHidden();
    await expect(page.getByTestId("board-desktop-dock")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Calendar" })).toBeVisible();

    await expectSingleLine(page.locator("h1").filter({ hasText: "Responsive Board" }));

    await page.getByRole("tab", { name: "Calendar" }).click();
    await expect(page.getByRole("heading", { name: /October \d{4}/ })).toBeVisible();
    await expectSingleLine(page.getByRole("heading", { name: /October \d{4}/ }));
    await expectNoPageOverflow(page);

    await page.getByRole("tab", { name: "List" }).click();
    await expect(page).toHaveURL(/\/boards\/.*[?&]view=list/);

    const dock = page.getByTestId("board-desktop-dock");
    await expect(dock).toBeVisible();
    await expect(dock.getByRole("tab", { name: "List" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page.getByText("Responsive Task", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expectNoPageOverflow(page);

    await dock.getByRole("tab", { name: "Board" }).click();
    await expect(page).toHaveURL(/\/boards\/[^?]+$/);
    await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expectSingleLine(page.getByRole("heading", { name: /Welcome back/i }));
    await expectSingleLine(page.getByText("Active Tasks", { exact: true }));
    await expectNoPageOverflow(page);
  });
});
