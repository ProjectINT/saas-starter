import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the local stack: `npm run db:start && npm run
// env:local`, then `npm run test:e2e`. The app is started (or reused when
// `npm run dev` already runs) on port 3000, where the Auth email hook calls it.

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  testDir: "e2e",
  // The flows share one database and one Mailpit; parallel runs would only race for emails.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
