import { test, expect } from "@playwright/test";

// Public journeys intentionally require no database, seed, or authenticated API calls.
test.describe("Public landing page", () => {
  test("connects visitors to registration and sign-in and protects app routes", async ({
    page,
  }) => {
    const privateRequests: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/(boards|tasks|messages)/.test(request.url()))
        privateRequests.push(request.url());
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Big ideas. Beautifully organized." }),
    ).toBeVisible({ timeout: 15000 });
    await page.getByRole("link", { name: "Find your flow" }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { name: "Create an account" }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page
      .getByRole("navigation", { name: "Footer navigation" })
      .getByRole("link", { name: "Sign in" })
      .click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.goto("/boards/private-board");
    await expect(page).toHaveURL(/\/login$/);
    expect(privateRequests).toEqual([]);
  });

  test("supports keyboard view selection, section links, and FAQ disclosure", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Take a look inside" }).click();
    await expect(page).toHaveURL(/#product-preview$/);
    const boardTab = page.getByRole("tab", { name: "Board", exact: true });
    await boardTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "List", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("Task name");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tabpanel")).toContainText(
      "June · Sample schedule",
    );
    await page
      .getByRole("navigation", { name: "Footer navigation" })
      .getByRole("link", { name: "FAQs" })
      .click();
    await expect(page).toHaveURL(/#questions$/);
    const question = page.getByRole("button", {
      name: "Can I choose who can edit a board?",
    });
    await question.focus();
    await page.keyboard.press("Enter");
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByText(
        /Boards have owner, admin, editor, commenter, and viewer roles/,
      ),
    ).toBeVisible();
    await question.click();
    await expect(question).toHaveAttribute("aria-expanded", "false");
  });

  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
    ["small-mobile", 320, 740],
  ] as const) {
    test(`lays out and navigates at ${name} size`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height });
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width < 900) {
        const menu = page.getByRole("button", { name: "Open navigation" });
        await menu.click();
        await expect(
          page.getByRole("navigation", { name: "Mobile navigation" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(menu).toBeFocused();
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await menu.click();
        await page
          .getByRole("navigation", { name: "Mobile navigation" })
          .getByRole("link", { name: "Features" })
          .click();
        await expect(page).toHaveURL(/#features$/);
        await expect(
          page.getByRole("navigation", { name: "Mobile navigation" }),
        ).toBeHidden();
      }
      await page.getByRole("tab", { name: "List", exact: true }).click();
      await expect(page.getByRole("tabpanel")).toContainText(
        "Bring the new look to life",
      );
      await page.getByRole("tab", { name: "Calendar", exact: true }).click();
      await expect(page.getByRole("tabpanel")).toContainText(
        "June · Sample schedule",
      );
      await page.getByRole("tab", { name: "Board", exact: true }).click();
      await expect(
        page.getByRole("tab", { name: "Board", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      // The sample board deliberately scrolls within its own panel on phones.
      const panel = page.getByRole("tabpanel");
      if (width < 600) {
        await panel.scrollIntoViewIfNeeded();
        await panel.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        await expect(
          panel.getByText("Make room for a fresh start", { exact: true }),
        ).toBeInViewport();
        await panel.evaluate((element) => {
          element.scrollLeft = 0;
        });
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(`landing-${name}-hero.png`),
      });
      await page.screenshot({
        path: testInfo.outputPath(`landing-${name}-full.png`),
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }

  test("respects reduced motion and keeps content visible", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page
        .locator(".landing-hero-content")
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe("none");
    await page
      .getByRole("button", { name: "What is Sticky Mind Grid?" })
      .click();
    await expect(
      page.getByText(/Sticky Mind Grid is a collaborative visual workspace/),
    ).toBeVisible();
  });
});
