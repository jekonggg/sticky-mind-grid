import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail } from "./helpers";

test.describe("Settings Modal", () => {
  let currentEmail: string;

  test.beforeEach(async ({ page }) => {
    currentEmail = uniqueEmail("settings");
    await registerUser(page, currentEmail, "Testpassword123!", "Settings User");
    await page.getByRole("button", { name: /user menu/i }).click();
    await page.getByRole("menuitem", { name: /all settings/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test.describe("Profile tab", () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole("button", { name: "Account Profile" }).click();
    });

    test("shows profile form fields", async ({ page }) => {
      await expect(page.locator("#fullName")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#email")).toBeDisabled();
      await expect(page.getByRole("button", { name: "Save Profile Changes" })).toBeVisible();
    });

    test("pre-fills current user name", async ({ page }) => {
      await expect(page.locator("#fullName")).toHaveValue("Settings User");
    });

    test("pre-fills email as disabled", async ({ page }) => {
      await expect(page.locator("#email")).toHaveValue(currentEmail);
    });

    test("shows password change fields", async ({ page }) => {
      await expect(page.locator("#newPassword")).toBeVisible();
      await expect(page.locator("#confirmPassword")).toBeVisible();
    });

    test("shows upload avatar button", async ({ page }) => {
      await expect(page.getByRole("button", { name: "Upload Avatar" })).toBeVisible();
    });

    test("edits full name", async ({ page }) => {
      await page.locator("#fullName").clear();
      await page.locator("#fullName").fill("New Name");
      await page.getByRole("button", { name: "Save Profile Changes" }).click();
      await expect(page.getByText("Profile updated")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Appearance tab", () => {
    test("switches to appearance tab", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await expect(page.getByRole("button", { name: /^Light/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Dark/ })).toBeVisible();
      await expect(page.getByRole("button", { name: /^System Syncs/ })).toBeVisible();
    });

    test("shows theme descriptions", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await expect(page.getByText("Clean white & floating cards")).toBeVisible();
      await expect(page.getByText("Multi-tiered obsidian & rich accents")).toBeVisible();
      await expect(page.getByText("Syncs with OS display preferences")).toBeVisible();
    });

    test("selects dark theme", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await page.getByRole("button", { name: /^Dark/ }).click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    });

    test("selects light theme", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await page.getByRole("button", { name: /^Light/ }).click();
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    });

    test("shows reduced motion toggle", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await expect(page.locator("#reduced-motion")).toBeVisible();
    });

    test("shows reset defaults button", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await expect(page.getByRole("button", { name: "Reset Defaults" })).toBeVisible();
    });
  });

  test.describe("Settings navigation", () => {
    test("has all settings tabs", async ({ page }) => {
      for (const tab of [
        "Account Profile",
        "Appearance",
        "Notifications & Sound",
        "Task & Workflow",
        "Language & Region",
        "Privacy & Data",
        "System & About",
      ]) {
        await expect(page.getByRole("button", { name: tab })).toBeVisible();
      }
    });

    test("can close settings with Escape", async ({ page }) => {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  });
});

test.describe("Settings Modal mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    const email = uniqueEmail("settings-mobile");
    await registerUser(page, email, "Testpassword123!", "Mobile Settings User");

    await page.getByRole("button", { name: "Open Menu" }).click();
    const navDrawer = page.getByRole("dialog", { name: "Navigation Menu" });
    await navDrawer.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: /all settings/i }).click();

    await expect(
      page.getByRole("dialog", { name: "Settings Dialog" })
    ).toBeVisible();
  });

  test("shows a vertically stacked section index with screen margins", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Settings Dialog" });
    // Wait out the dialog's open zoom/fade so all boxes are measured at the
    // same scale. Otherwise the two rows are a couple of pixels apart.
    await dialog.evaluate(async (el) => {
      await Promise.allSettled(
        el.getAnimations({ subtree: true }).map((animation) => animation.finished)
      );
    });
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    if (!dialogBox) return;

    // The inset card keeps breathing room on every side of the phone viewport.
    expect(dialogBox.x).toBeGreaterThanOrEqual(8);
    expect(dialogBox.y).toBeGreaterThanOrEqual(8);
    expect(dialogBox.width).toBeLessThanOrEqual(390 - 16);
    expect(dialogBox.height).toBeLessThanOrEqual(844 - 16);

    const nav = page.getByRole("navigation", { name: "Settings sections" });
    await expect(nav).toBeVisible();

    for (const label of [
      "Account Profile",
      "Appearance",
      "Notifications & Sound",
      "Task & Workflow",
      "Language & Region",
      "Privacy & Data",
      "System & About",
    ]) {
      await expect(
        page.getByRole("button", { name: new RegExp(label) })
      ).toBeVisible();
    }

    const profileBox = await page
      .getByRole("button", { name: /Account Profile/ })
      .boundingBox();
    const appearanceBox = await page
      .getByRole("button", { name: /^Appearance/ })
      .boundingBox();
    expect(profileBox).not.toBeNull();
    expect(appearanceBox).not.toBeNull();
    if (!profileBox || !appearanceBox) return;

    // Categories are stacked vertically in a left-aligned list, not a
    // horizontally scrolling tab strip.
    expect(appearanceBox.y).toBeGreaterThan(profileBox.y);
    expect(Math.abs(appearanceBox.x - profileBox.x)).toBeLessThan(1.5);

    const hasHorizontalOverflow = await nav.evaluate(
      (el) => el.scrollWidth > el.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("opens a section detail page and returns to the index", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Account Profile/ }).click();

    await expect(page.locator("#fullName")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Back to Settings" })
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Settings sections" })
    ).toHaveCount(0);

    const dialogBox = await page
      .getByRole("dialog", { name: "Settings Dialog" })
      .boundingBox();
    const inputBox = await page.locator("#fullName").boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(inputBox).not.toBeNull();
    if (!dialogBox || !inputBox) return;

    // 16px content padding inside the card, on top of the 12px card inset.
    expect(inputBox.x - dialogBox.x).toBeGreaterThanOrEqual(16);
    expect(inputBox.x).toBeGreaterThanOrEqual(24);

    await page.getByRole("button", { name: "Back to Settings" }).click();

    await expect(
      page.getByRole("navigation", { name: "Settings sections" })
    ).toBeVisible();
    await expect(page.locator("#fullName")).toHaveCount(0);
  });

  test("sidebar shortcuts open the selected section directly", async ({
    page,
  }) => {
    const settingsDialog = page.getByRole("dialog", {
      name: "Settings Dialog",
    });
    await page.keyboard.press("Escape");
    await expect(settingsDialog).not.toBeVisible();

    await page.getByRole("button", { name: "Open Menu" }).click();
    const navDrawer = page.getByRole("dialog", { name: "Navigation Menu" });
    await navDrawer.getByRole("button", { name: "User menu" }).click();
    await page.getByRole("menuitem", { name: /appearance & theme/i }).click();

    await expect(settingsDialog).toBeVisible();
    await expect(page.getByText("Appearance & Interface")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Back to Settings" })
    ).toBeVisible();
  });
});
