import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail } from "./helpers";

test.describe("Settings Modal", () => {
  let currentEmail: string;

  test.beforeEach(async ({ page }) => {
    currentEmail = uniqueEmail("settings");
    await registerUser(page, currentEmail, "testpassword123", "Settings User");
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
      await expect(page.getByRole("button", { name: "Light" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Dark" })).toBeVisible();
      await expect(page.getByRole("button", { name: /System.*Syncs/i })).toBeVisible();
    });

    test("shows theme descriptions", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await expect(page.getByText("Clean & bright interface")).toBeVisible();
      await expect(page.getByText("Sleek & comfortable at night")).toBeVisible();
      await expect(page.getByText("Syncs with OS preferences")).toBeVisible();
    });

    test("selects dark theme", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await page.getByRole("button", { name: "Dark" }).click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    });

    test("selects light theme", async ({ page }) => {
      await page.getByRole("button", { name: "Appearance" }).click();
      await page.getByRole("button", { name: "Light" }).click();
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
