import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const API_BASE = process.env.E2E_API_BASE_URL || "http://127.0.0.1:5000/api";
const SEEDED_BOARD_ID = "board-1";

async function loginSeededUser(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/", { timeout: 30000 });
}

async function getApiToken(request: APIRequestContext) {
  const loginResponse = await request.post(`${API_BASE}/auth/login`, {
    data: { email: "test@example.com", password: "password123" },
  });
  expect(loginResponse.ok(), "seeded user should be able to log in").toBeTruthy();
  const { token } = (await loginResponse.json()) as { token: string };
  expect(token, "auth token should be returned by login").toBeTruthy();
  return token;
}

async function seedCalendarTasks(request: APIRequestContext) {
  const token = await getApiToken(request);
  const runId = Date.now().toString(36);
  const now = new Date();
  const dueToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const overdueDate = new Date(dueToday);
  overdueDate.setDate(overdueDate.getDate() - 3);

  const titles = {
    active: `Mobile calendar ${runId}`,
    overdue: `Mobile overdue ${runId}`,
    completed: `Mobile completed ${runId}`,
  };

  const tasks = [
    {
      title: titles.active,
      dueDate: dueToday.toISOString(),
      priority: "high",
      status: "backlog",
      progress: 20,
    },
    {
      title: titles.overdue,
      dueDate: overdueDate.toISOString(),
      priority: "urgent",
      status: "backlog",
      progress: 10,
    },
    {
      title: titles.completed,
      dueDate: dueToday.toISOString(),
      priority: "medium",
      status: "backlog",
      progress: 100,
    },
  ];

  for (const task of tasks) {
    const response = await request.post(`${API_BASE}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { ...task, boardId: SEEDED_BOARD_ID },
    });
    expect(response.ok(), `failed to seed task "${task.title}"`).toBeTruthy();
  }

  return titles;
}

async function getSeededBoardName(request: APIRequestContext) {
  const token = await getApiToken(request);
  const boardsResponse = await request.get(`${API_BASE}/boards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(boardsResponse.ok(), "seeded user should be able to fetch boards").toBeTruthy();
  const boards = (await boardsResponse.json()) as Array<{ id: string; name: string }>;
  const board = boards.find((item) => item.id === SEEDED_BOARD_ID) ?? boards[0];
  expect(board, "seeded board should be available").toBeTruthy();
  return board.name;
}

test.describe("Global calendar mobile layout", () => {
  test("fits seven days and arranges toolbar and summary cards on mobile", async ({
    page,
    request,
  }) => {
    const titles = await seedCalendarTasks(request);
    await loginSeededUser(page);

    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.waitForURL("/calendar");
    const desktopHeading = page.getByRole("heading", { name: "Global Calendar" });
    await expect(desktopHeading).toBeVisible();
    await expect(desktopHeading).toHaveCSS("font-size", "30px");
    await expect(
      page.getByTestId("calendar-month-grid").getByText(titles.active, { exact: true })
    ).toBeVisible();
    // Let the calendar layout settle before measuring geometry.
    await page.waitForTimeout(600);

    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });

      const toolbar = page.getByTestId("calendar-toolbar");
      const calendar = page.getByTestId("calendar-grid-container");
      const mobileHeader = page.getByTestId("calendar-mobile-page-header");
      await expect(toolbar).toBeVisible();
      await expect(calendar).toBeVisible();
      const mobileHeading = mobileHeader.getByRole("heading", { name: "Global Calendar" });
      await expect(mobileHeading).toBeVisible();
      await expect(mobileHeading).toHaveCSS("font-size", "24px");
      // The responsive header mounts after the viewport changes; let the
      // surrounding layout settle before measuring viewport-relative boxes.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await expect(
        page.getByTestId("calendar-mobile-header").getByRole("heading", { level: 2 })
      ).toBeVisible();
      await expect(page.getByTestId("calendar-toolbar-icon")).toHaveCount(0);
      await expect(page.getByTestId("calendar-weekdays").locator(":scope > div")).toHaveCount(7);

      const toolbarBox = await toolbar.boundingBox();
      const calendarBox = await calendar.boundingBox();
      const mobileHeaderBox = await mobileHeader.boundingBox();
      expect(toolbarBox).not.toBeNull();
      expect(calendarBox).not.toBeNull();
      expect(mobileHeaderBox).not.toBeNull();
      if (!toolbarBox || !calendarBox || !mobileHeaderBox) return;

      // The page header precedes the compact toolbar, matching the other workspace pages.
      expect(mobileHeaderBox.y).toBeLessThan(toolbarBox.y);
      expect(mobileHeaderBox.y + mobileHeaderBox.height).toBeLessThanOrEqual(toolbarBox.y);

      // The calendar sits below the compact toolbar and spans the viewport width.
      expect(toolbarBox.height).toBeLessThanOrEqual(64);
      expect(calendarBox.y).toBeGreaterThanOrEqual(toolbarBox.y + toolbarBox.height);
      expect(calendarBox.x).toBeGreaterThanOrEqual(0);
      expect(calendarBox.x + calendarBox.width).toBeLessThanOrEqual(width + 1);

      // All primary toolbar actions stay together on the top row.
      for (const name of ["Previous", "Today", "Next", "Schedule Task"]) {
        await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
      }
      const controlBoxes = await Promise.all(
        ["Previous", "Today", "Next", "Schedule Task"].map((name) =>
          page.getByRole("button", { name, exact: true }).boundingBox()
        )
      );
      const controlTops: number[] = [];
      const viewSwitcherBox = await page
        .getByTestId("calendar-view-switcher-mobile")
        .boundingBox();
      expect(viewSwitcherBox).not.toBeNull();
      controlBoxes.forEach((box) => {
        expect(box).not.toBeNull();
        if (!box) return;
        controlTops.push(box.y);
        expect(box.y).toBeGreaterThanOrEqual(toolbarBox.y - 1);
        expect(box.y + box.height).toBeLessThanOrEqual(toolbarBox.y + toolbarBox.height + 1);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        if (viewSwitcherBox) {
          expect(box.y + box.height).toBeLessThanOrEqual(viewSwitcherBox.y + 1);
        }
      });
      expect(Math.max(...controlTops) - Math.min(...controlTops)).toBeLessThanOrEqual(2);

      // Sunday through Saturday are all visible within the viewport at a readable width.
      const weekdays = page.getByTestId("calendar-weekdays").locator(":scope > div");
      const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let index = 0; index < weekdayLabels.length; index += 1) {
        const weekday = weekdays.nth(index);
        await expect(weekday).toHaveText(weekdayLabels[index]);
        const box = await weekday.boundingBox();
        expect(box).not.toBeNull();
        if (!box) continue;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        expect(box.width).toBeGreaterThan(30);
      }

      const gridMetrics = await calendar.evaluate((element) => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));
      expect(gridMetrics.scrollWidth).toBeLessThanOrEqual(gridMetrics.clientWidth + 1);

      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(pageOverflow).toBeLessThanOrEqual(1);

      // The selected day's due tasks sit directly below the calendar at full width.
      const agenda = page.getByTestId("calendar-selected-day-agenda");
      await expect(agenda).toBeVisible();
      await expect(agenda.getByText(titles.active, { exact: true })).toBeVisible();
      const agendaBox = await agenda.boundingBox();
      expect(agendaBox).not.toBeNull();
      if (agendaBox) {
        expect(agendaBox.y).toBeGreaterThanOrEqual(calendarBox.y + calendarBox.height - 1);
        expect(agendaBox.width).toBeGreaterThanOrEqual(calendarBox.width - 1);
      }

      const overdueCard = page.getByTestId("calendar-overdue-card");
      const completedCard = page.getByTestId("calendar-completed-card");
      await expect(overdueCard).toBeVisible();
      await expect(completedCard).toBeVisible();
      await expect(overdueCard.getByRole("heading", { name: /overdue tasks/i })).toBeVisible();
      await expect(completedCard.getByRole("heading", { name: /completed \(/i })).toBeVisible();

      const overdueBox = await overdueCard.boundingBox();
      const completedBox = await completedCard.boundingBox();
      expect(overdueBox).not.toBeNull();
      expect(completedBox).not.toBeNull();
      if (!overdueBox || !completedBox) return;
      expect(Math.abs(overdueBox.y - completedBox.y)).toBeLessThanOrEqual(2);
      expect(overdueBox.x).toBeLessThan(completedBox.x);
      expect(overdueBox.width).toBeGreaterThan(width * 0.35);
      expect(completedBox.width).toBeGreaterThan(width * 0.35);
      expect(Math.abs(overdueBox.height - completedBox.height)).toBeLessThanOrEqual(2);

      // Keep the reference composition: the calendar is the dominant block,
      // with the paired summary cards roughly two-thirds of its height.
      const summaryToCalendarRatio = overdueBox.height / calendarBox.height;
      expect(summaryToCalendarRatio).toBeGreaterThan(0.6);
      expect(summaryToCalendarRatio).toBeLessThan(0.8);
    }

    const calendar = page.getByTestId("calendar-grid-container");

    // Add-task and alternate views remain functional without horizontal scrolling.
    await page.getByRole("button", { name: "Schedule Task", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Week", exact: true }).click();
    await expect(page.getByTestId("calendar-month-grid")).toBeHidden();
    await expect(calendar.getByText("Sun", { exact: true })).toBeVisible();
    await expect
      .poll(async () => calendar.evaluate((element) => element.scrollWidth - element.clientWidth))
      .toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Day", exact: true }).click();
    await expect(calendar.getByText("12 AM", { exact: true })).toBeVisible();
    await expect
      .poll(async () => calendar.evaluate((element) => element.scrollWidth - element.clientWidth))
      .toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Month", exact: true }).click();
    await expect(page.getByTestId("calendar-month-grid")).toBeVisible();

    // Calendar events remain interactive.
    const event = page
      .getByTestId("calendar-month-grid")
      .getByText(titles.active, { exact: true });
    await event.click();
    await expect(page.getByTestId("task-detail-drawer")).toBeVisible();
    await page.locator('button[title="Close task (Esc)"]').first().click();

    // Desktop keeps the original stacked sidebar and selected-day agenda.
    await page.setViewportSize({ width: 1281, height: 900 });
    await expect(page.getByTestId("calendar-selected-day-agenda")).toBeVisible();
    const desktopOverdue = await page.getByTestId("calendar-overdue-card").boundingBox();
    const desktopCompleted = await page.getByTestId("calendar-completed-card").boundingBox();
    expect(desktopOverdue).not.toBeNull();
    expect(desktopCompleted).not.toBeNull();
    if (!desktopOverdue || !desktopCompleted) return;
    expect(Math.abs(desktopOverdue.x - desktopCompleted.x)).toBeLessThanOrEqual(2);
    expect(desktopCompleted.y).toBeGreaterThan(
      desktopOverdue.y + desktopOverdue.height - 2
    );
    await expect(page.getByRole("button", { name: "Month", exact: true })).toBeVisible();
  });

  test("keeps the schedule action separated from navigation while resizing", async ({
    page,
  }) => {
    await loginSeededUser(page);
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.waitForURL("/calendar");
    await expect(page.getByRole("heading", { name: "Global Calendar" })).toBeVisible();

    for (const width of [640, 768, 900, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);

      const toolbar = page.getByTestId("calendar-toolbar");
      const schedule = page.getByRole("button", { name: "Schedule Task", exact: true });
      const previous = page.getByRole("button", { name: "Previous", exact: true });
      const next = page.getByRole("button", { name: "Next", exact: true });
      await expect(toolbar).toBeVisible();
      await expect(schedule).toBeVisible();
      await expect(previous).toBeVisible();
      await expect(next).toBeVisible();

      const toolbarBox = await toolbar.boundingBox();
      const scheduleBox = await schedule.boundingBox();
      const previousBox = await previous.boundingBox();
      const nextBox = await next.boundingBox();
      expect(toolbarBox).not.toBeNull();
      expect(scheduleBox).not.toBeNull();
      expect(previousBox).not.toBeNull();
      expect(nextBox).not.toBeNull();
      if (!toolbarBox || !scheduleBox || !previousBox || !nextBox) return;

      // The action remains inside the toolbar and never covers navigation.
      expect(scheduleBox.x).toBeGreaterThanOrEqual(nextBox.x + nextBox.width - 1);
      expect(scheduleBox.y).toBeGreaterThanOrEqual(toolbarBox.y - 1);
      expect(scheduleBox.y + scheduleBox.height).toBeLessThanOrEqual(
        toolbarBox.y + toolbarBox.height + 1
      );
      expect(scheduleBox.x + scheduleBox.width).toBeLessThanOrEqual(
        toolbarBox.x + toolbarBox.width + 1
      );

      if (width >= 768) {
        const viewSwitcher = page.getByTestId("calendar-view-switcher");
        await expect(viewSwitcher).toBeVisible();
        const viewSwitcherBox = await viewSwitcher.boundingBox();
        expect(viewSwitcherBox).not.toBeNull();
        if (viewSwitcherBox) {
          expect(previousBox.x).toBeGreaterThanOrEqual(
            viewSwitcherBox.x + viewSwitcherBox.width - 1
          );
        }
      }

      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(pageOverflow).toBeLessThanOrEqual(1);
    }
  });

  test("fits all seven weekdays on iPad portrait viewports without horizontal cutoff", async ({
    page,
    request,
  }) => {
    await seedCalendarTasks(request);
    await loginSeededUser(page);

    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.waitForURL("/calendar");

    // Test standard iPad portrait widths: 768 (Mini/standard), 810 (10th gen), 820 (Air), 834 (Pro 11")
    for (const width of [768, 810, 820, 834]) {
      await page.setViewportSize({ width, height: 1024 });
      await page.waitForTimeout(300);

      const calendar = page.getByTestId("calendar-grid-container");
      await expect(calendar).toBeVisible();

      // Ensure all 7 weekday column headers (Sun through Sat) are visible and within viewport
      const weekdays = page.getByTestId("calendar-weekdays").locator(":scope > div");
      const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let index = 0; index < weekdayLabels.length; index += 1) {
        const weekday = weekdays.nth(index);
        await expect(weekday).toHaveText(weekdayLabels[index]);
        const box = await weekday.boundingBox();
        expect(box).not.toBeNull();
        if (!box) continue;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }

      // Check that the calendar grid does not horizontally overflow
      const gridMetrics = await calendar.evaluate((element) => ({
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      }));
      expect(gridMetrics.scrollWidth).toBeLessThanOrEqual(gridMetrics.clientWidth + 1);

      // Check that the page itself does not horizontally overflow
      const pageOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      );
      expect(pageOverflow).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("Board calendar mobile layout", () => {
  test("uses the same compact calendar inside a board tab", async ({ page, request }) => {
    const boardName = await getSeededBoardName(request);
    await loginSeededUser(page);

    await page.locator(".grid").getByRole("heading", { name: boardName }).first().click();
    await page.waitForURL(/\/boards\//, { timeout: 15000 });
    await page
      .locator("h1")
      .filter({ hasText: boardName })
      .waitFor({ state: "visible", timeout: 15000 });
    await expect(page.getByTestId("board-desktop-dock")).toBeVisible({ timeout: 15000 });

    await page.setViewportSize({ width: 320, height: 844 });
    const rail = page.getByTestId("board-view-rail");
    await expect(rail).toBeVisible();
    await rail.getByRole("button", { name: "Calendar", exact: true }).click();
    await page.waitForURL(/[?&]view=calendar/);

    const calendar = page.getByTestId("calendar-grid-container");
    await expect(calendar).toBeVisible();
    await expect(page.getByTestId("calendar-toolbar")).toBeVisible();
    await expect(page.getByTestId("calendar-weekdays").locator(":scope > div")).toHaveCount(7);
    const agenda = page.getByTestId("calendar-selected-day-agenda");
    await expect(agenda).toBeVisible();
    const calendarBox = await calendar.boundingBox();
    const agendaBox = await agenda.boundingBox();
    expect(calendarBox).not.toBeNull();
    expect(agendaBox).not.toBeNull();
    if (agendaBox && calendarBox) {
      expect(agendaBox.y).toBeGreaterThanOrEqual(calendarBox.y + calendarBox.height - 1);
      expect(agendaBox.width).toBeGreaterThanOrEqual(calendarBox.width - 1);
    }
    await expect(page.getByTestId("calendar-overdue-card")).toBeVisible();
    await expect(page.getByTestId("calendar-completed-card")).toBeVisible();

    await expect
      .poll(async () => calendar.evaluate((element) => element.scrollWidth - element.clientWidth))
      .toBeLessThanOrEqual(1);
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(pageOverflow).toBeLessThanOrEqual(1);
  });
});
