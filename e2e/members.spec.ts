import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  uniqueEmail,
} from "./helpers";

const EMAIL_OWNER = uniqueEmail("member-owner");
const EMAIL_MEMBER = uniqueEmail("member-invite");

test.describe("Board Members", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, EMAIL_OWNER, "testpassword123", "Owner User");
    await createBoard(page, "Members Test Board");
    await navigateToBoard(page, "Members Test Board");
  });

  test.describe("Members view", () => {
    test("shows members tab", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await expect(page.getByText(/Active Board Members/)).toBeVisible();
    });

    test("shows current user as owner", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await expect(page.getByText("Owner User")).toBeVisible();
      await expect(page.getByText("owner")).toBeVisible();
    });

    test("shows invite member button", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await expect(page.getByRole("button", { name: "Invite Member" })).toBeVisible();
    });

    test("shows leave board button", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await expect(page.locator('button[title="Leave this board"]')).toBeVisible();
    });
  });

  test.describe("Invite member", () => {
    test("opens invite dialog", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await expect(page.getByText("Invite to Board")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });

    test("invite dialog has role selector", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await expect(page.getByText("Assign Board Role")).toBeVisible();
      await expect(page.getByRole("button", { name: "Send Invite" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    test("invite dialog can be cancelled", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Invite to Board")).not.toBeVisible();
    });

    test("invite by email sends invitation", async ({ page }) => {
      await page.getByRole("button", { name: "Members" }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await page.locator("#email").fill(EMAIL_MEMBER);
      await page.getByRole("button", { name: "Send Invite" }).click();
      await expect(page.getByText("Member invited successfully")).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Role badge", () => {
    test("shows owner badge on board page", async ({ page }) => {
      await expect(page.getByText("Owner")).toBeVisible();
    });
  });
});
