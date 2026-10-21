import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
const port = new URL(baseURL).port || "5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1281, height: 720 },
      },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: `npx vite --port ${port}`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },
});
