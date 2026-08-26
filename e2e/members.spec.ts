import { test, expect } from "@playwright/test";
import {
  registerUser,
  createBoard,
  navigateToBoard,
  uniqueEmail,
} from "./helpers";

test.describe("Board Members", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("member-owner"), "testpassword123", "Owner User");
    await createBoard(page, "Members Test Board");
    await navigateToBoard(page, "Members Test Board");
  });

  test.describe("Members view", () => {
    test("shows members tab", async ({ page }) => {
      await page.getByRole("button", { name: "Members", exact: true }).click();
      await expect(page.getByText(/Active Board Members/)).toBeVisible();
    });

    test("shows current user as owner", async ({ page }) => {
      await page.getByRole("button", { name: "Members", exact: true }).click();
      await expect(page.getByText("Owner User").first()).toBeVisible();
      await expect(page.getByText(/owner/i).first()).toBeVisible();
    });

    test("shows invite member button", async ({ page }) => {
      await page.getByRole("button", { name: "Members", exact: true }).click();
      await expect(page.getByRole("button", { name: "Invite Member" })).toBeVisible();
    });

    test("leave board button is not visible for owner", async ({ page }) => {
      await page.getByRole("button", { name: "Members", exact: true }).click();
      await expect(page.locator('button[title="Leave this board"]')).not.toBeVisible();
    });
  });

  test.describe("Invite member", () => {
    test("opens invite dialog", async ({ page }) => {
      await page.getByRole("button", { name: "Members", exact: true }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await expect(page.getByText("Invite to Board")).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
    });

    test("invite dialog has role selector", async ({ page }) => {
      await page.getByRole("button", { name: "Members", exact: true }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await expect(page.getByText("Assign Board Role")).toBeVisible();
      await expect(page.getByRole("button", { name: "Send Invite" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    });

    test("invite dialog can be cancelled", async ({ page }) => {
      await page.getByRole("button", { name: "Members", exact: true }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByText("Invite to Board")).not.toBeVisible();
    });

    test("invite by email sends invitation", async ({ page, request }) => {
      const inviteeEmail = uniqueEmail("member-invite");
      await request.post("http://127.0.0.1:5000/api/auth/register", {
        data: {
          email: inviteeEmail,
          password: "password123",
          fullName: "Invited Member",
        },
      });

      await page.getByRole("button", { name: "Members", exact: true }).click();
      await page.getByRole("button", { name: "Invite Member" }).click();
      await page.locator("#email").fill(inviteeEmail);
      await page.getByRole("button", { name: "Send Invite" }).click();
      await expect(page.getByText(/Member invited successfully/)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Role badge", () => {
    test("shows owner badge on board page", async ({ page }) => {
      await expect(page.getByText("Owner")).toBeVisible();
    });
  });
});
