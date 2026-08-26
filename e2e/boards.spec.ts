import { test, expect } from "@playwright/test";
import { registerUser, createBoard, navigateToBoard, uniqueEmail } from "./helpers";

test.describe("Boards Overview", () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page, uniqueEmail("boards"));
  });

  test("shows empty state for new user", async ({ page }) => {
    await expect(page.getByText("No boards yet")).toBeVisible();
    await expect(page.getByText(/Create your first board/)).toBeVisible();
  });

  test("shows page heading and branding", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sticky Mind Grid" }).first()).toBeVisible();
    await expect(page.getByText("Your boards, in one place.")).toBeVisible();
    await expect(page.getByText("My Boards")).toBeVisible();
  });

  test.describe("Board CRUD", () => {
    test("creates a board with name and description", async ({ page }) => {
      await createBoard(page, "My Project", "A project board");
      await expect(page.getByRole("heading", { name: "My Project" })).toBeVisible();
      await expect(page.getByText("A project board")).toBeVisible();
    });

    test("navigates to board after creating", async ({ page }) => {
      await createBoard(page, "Navigate Board");
      await navigateToBoard(page, "Navigate Board");
      await expect(page).toHaveURL(/\/boards\//);
      await expect(page.locator("h1").filter({ hasText: "Navigate Board" })).toBeVisible();
    });

    test("edits a board name", async ({ page }) => {
      await createBoard(page, "Original Name");
      const card = page.locator(".group.cursor-pointer").filter({ hasText: "Original Name" });
      await card.hover();
      await card.locator("button").last().click();
      await page.getByRole("menuitem", { name: "Edit" }).click();
      await expect(page.getByRole("heading", { name: "Edit Board" })).toBeVisible();
      await page.getByPlaceholder("Project or Board name…").clear();
      await page.getByPlaceholder("Project or Board name…").fill("Updated Name");
      await page.getByRole("dialog").getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByRole("heading", { name: "Updated Name" })).toBeVisible();
    });

    test("deletes a board via confirmation dialog", async ({ page }) => {
      await createBoard(page, "Delete Me");
      const card = page.locator(".group.cursor-pointer").filter({ hasText: "Delete Me" });
      await card.hover();
      await card.locator("button").last().click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await expect(page.getByText(/Delete "Delete Me"\?/)).toBeVisible();
      await expect(page.getByText(/This will permanently delete this board/)).toBeVisible();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
      await expect(page.getByText("No boards yet")).toBeVisible({ timeout: 5000 });
    });

    test("cancel delete keeps the board", async ({ page }) => {
      await createBoard(page, "Keep Me");
      const card = page.locator(".group.cursor-pointer").filter({ hasText: "Keep Me" });
      await card.hover();
      await card.locator("button").last().click();
      await page.getByRole("menuitem", { name: "Delete" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("heading", { name: "Keep Me" })).toBeVisible();
    });

    test("multiple boards appear in grid", async ({ page }) => {
      await createBoard(page, "Board Alpha");
      await createBoard(page, "Board Beta");
      await createBoard(page, "Board Gamma");
      await expect(page.getByRole("heading", { name: "Board Alpha" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Board Beta" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Board Gamma" })).toBeVisible();
    });
  });

  test.describe("Search", () => {
    test("filters boards by name", async ({ page }) => {
      await createBoard(page, "Frontend App");
      await createBoard(page, "Backend API");
      await createBoard(page, "DevOps Pipeline");
      await page.getByPlaceholder("Search boards…").fill("Frontend");
      await expect(page.locator(".grid").getByRole("heading", { name: "Frontend App" })).toBeVisible();
      await expect(page.locator(".grid").getByRole("heading", { name: "Backend API" })).not.toBeVisible();
      await expect(page.locator(".grid").getByRole("heading", { name: "DevOps Pipeline" })).not.toBeVisible();
    });

    test("filters boards by description", async ({ page }) => {
      await createBoard(page, "Project Alpha", "Machine learning pipeline");
      await createBoard(page, "Project Beta", "Web application frontend");
      await page.getByPlaceholder("Search boards…").fill("machine learning");
      await expect(page.locator(".grid").getByRole("heading", { name: "Project Alpha" })).toBeVisible();
      await expect(page.locator(".grid").getByRole("heading", { name: "Project Beta" })).not.toBeVisible();
    });

    test("shows no results message", async ({ page }) => {
      await createBoard(page, "Existing Board");
      await page.getByPlaceholder("Search boards…").fill("Nonexistent");
      await expect(page.getByText(/No boards matching/)).toBeVisible();
    });

    test("clearing search restores all boards", async ({ page }) => {
      await createBoard(page, "Board One");
      await createBoard(page, "Board Two");
      await page.getByPlaceholder("Search boards…").fill("Board One");
      await expect(page.locator(".grid").getByRole("heading", { name: "Board Two" })).not.toBeVisible();
      await page.getByPlaceholder("Search boards…").clear();
      await expect(page.locator(".grid").getByRole("heading", { name: "Board One" })).toBeVisible();
      await expect(page.locator(".grid").getByRole("heading", { name: "Board Two" })).toBeVisible();
    });
  });

  test.describe("Sort", () => {
    test("sorts boards by name A-Z", async ({ page }) => {
      await createBoard(page, "Zebra Board");
      await createBoard(page, "Alpha Board");
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "Name (A–Z)" }).click();
      const cards = page.locator(".grid .group.cursor-pointer");
      await expect(cards.first()).toContainText("Alpha Board");
      await expect(cards.last()).toContainText("Zebra Board");
    });

    test("sorts boards by created date", async ({ page }) => {
      await createBoard(page, "First Board");
      await createBoard(page, "Second Board");
      await page.getByRole("combobox").click();
      await page.getByRole("option", { name: "Created Date" }).click();
      const cards = page.locator(".grid .group.cursor-pointer");
      await expect(cards.first()).toContainText("Second Board");
      await expect(cards.last()).toContainText("First Board");
    });
  });

  test.describe("Logout", () => {
    test("logs out and redirects to login", async ({ page }) => {
      await page.getByRole("button", { name: /user menu/i }).click();
      await page.getByRole("menuitem", { name: /log out/i }).click();
      await expect(page).toHaveURL("/login");
    });
  });
});
