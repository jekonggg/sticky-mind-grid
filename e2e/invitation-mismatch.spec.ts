import { test, expect } from "@playwright/test";

test.describe("Board Invitation Link & Account Mismatch Flow", () => {
  const mockInvite = {
    id: "e2e-invite-test-id",
    boardId: "board-invite-e2e",
    boardName: "Phoenix Sprint Board",
    boardEmoji: "🔥",
    boardColor: "#2563eb",
    inviterName: "Sarah Connor",
    invitedEmail: "usera_invited@example.com",
    role: "editor",
    status: "pending",
    isExpired: false,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  test.beforeEach(async ({ page }) => {
    // Intercept single invitation preview API
    await page.route("**/api/boards/invitations/e2e-invite-test-id", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockInvite),
        });
      } else {
        await route.continue();
      }
    });

    // Intercept accept API
    await page.route("**/api/boards/invitations/e2e-invite-test-id/accept", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "membership-e2e-123",
          boardId: mockInvite.boardId,
          userId: "user-a-id",
          role: "editor",
          status: "accepted",
        }),
      });
    });

    // Intercept boards fetch so redirect to /boards/board-invite-e2e works
    await page.route(`**/api/boards/${mockInvite.boardId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: mockInvite.boardId,
          name: mockInvite.boardName,
          emoji: mockInvite.boardEmoji,
          color: mockInvite.boardColor,
          columns: [{ id: "todo", title: "To Do", tasks: [] }],
        }),
      });
    });
  });

  test("unauthenticated visitor sees invite preview and can proceed to login with prefilled email and redirect", async ({ page }) => {
    await page.goto("/invite/e2e-invite-test-id");

    // Verify unauthenticated card details
    await expect(page.getByTestId("invite-unauthenticated-card")).toBeVisible();
    await expect(page.getByText("Phoenix Sprint Board")).toBeVisible();
    await expect(page.getByText(/Sarah Connor/i)).toBeVisible();
    await expect(page.getByText("usera_invited@example.com")).toBeVisible();

    // Click Sign In to Accept
    await page.getByTestId("signin-to-accept-button").click();

    // Verify redirected to login with query params and prefilled email
    await expect(page).toHaveURL(/\/login\?email=usera_invited%40example\.com&redirect=%2Finvite%2Fe2e-invite-test-id/);
    await expect(page.getByLabel("Email")).toHaveValue("usera_invited@example.com");
  });

  test("visitor logged in as User B sees Account Mismatch card and cannot accept until switching account", async ({ page }) => {
    // Seed localStorage with User B session
    await page.addInitScript(() => {
      localStorage.setItem("auth_token", "fake-jwt-token-for-userb");
      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          id: "user-b-id",
          email: "userb_other@example.com",
          fullName: "User B Impostor",
        })
      );
    });

    await page.goto("/invite/e2e-invite-test-id");

    // Verify Account Mismatch warning card
    await expect(page.getByTestId("invite-account-mismatch-card")).toBeVisible();
    await expect(page.getByText(/Account Mismatch/i)).toBeVisible();
    await expect(page.getByText("userb_other@example.com").first()).toBeVisible();
    await expect(page.getByText("usera_invited@example.com").first()).toBeVisible();

    // Verify explicit accept button is absent for User B
    await expect(page.getByTestId("explicit-accept-button")).not.toBeVisible();

    // Click Switch & Sign In button
    await page.getByTestId("switch-account-button").click();

    // Verify User B was logged out and redirected to login with User A prefilled
    await expect(page).toHaveURL(/\/login\?email=usera_invited%40example\.com&redirect=%2Finvite%2Fe2e-invite-test-id/);
    await expect(page.getByLabel("Email")).toHaveValue("usera_invited@example.com");

    const tokenInStorage = await page.evaluate(() => localStorage.getItem("auth_token"));
    expect(tokenInStorage).toBeNull();
  });

  test("visitor logged in as User A (matching email) can explicitly accept invitation", async ({ page }) => {
    // Seed localStorage with User A session
    await page.addInitScript(() => {
      localStorage.setItem("auth_token", "fake-jwt-token-for-usera");
      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          id: "user-a-id",
          email: "usera_invited@example.com",
          fullName: "User A Recipient",
        })
      );
    });

    await page.goto("/invite/e2e-invite-test-id");

    // Verify matching card
    await expect(page.getByTestId("invite-matching-card")).toBeVisible();
    await expect(page.getByText("Phoenix Sprint Board")).toBeVisible();
    await expect(page.getByText("usera_invited@example.com")).toBeVisible();

    // Click explicit Accept button
    const acceptBtn = page.getByTestId("explicit-accept-button");
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // Verify redirect to board workspace
    await page.waitForURL(/\/boards\/board-invite-e2e/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/boards\/board-invite-e2e/);
  });
});
