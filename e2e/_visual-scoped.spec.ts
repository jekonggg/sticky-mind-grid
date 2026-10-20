import { test } from "@playwright/test";
import {
  createBoard,
  createTask,
  navigateToBoard,
  registerUser,
  uniqueEmail,
} from "./helpers";

const out = (name: string) =>
  `C:/Users/ramos/AppData/Local/Temp/opencode/scoped-${name}.png`;

test("visual scoped tasks navigation", async ({ page }) => {
  await registerUser(page, uniqueEmail("scoped-visual"), undefined, "Scoped Visual");
  await createBoard(page, "Scoped Board", "Scoped Tasks page navigation");
  await navigateToBoard(page, "Scoped Board");
  await createTask(page, "Scoped Task");

  await page.setViewportSize({ width: 320, height: 900 });
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("320-list") });

  await page.setViewportSize({ width: 768, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out("768-list") });
});
