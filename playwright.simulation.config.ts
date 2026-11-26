import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end simulation walkthrough (counsellor -> student -> teacher) against
 * the LOCAL Supabase stack. Prerequisites: `npx supabase start`,
 * `npm run demo:reset`, `npm run demo:functions`. Run with:
 *
 *   npx playwright test -c playwright.simulation.config.ts
 *
 * The suite changes simulation data; run `npm run demo:reset` afterwards.
 */
export default defineConfig({
  testDir: "./tests/simulation",
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results/simulation-artifacts",
  use: {
    baseURL: "http://127.0.0.1:5180",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
  },
  webServer: {
    command: process.platform === "win32" ? "npm.cmd run dev:demo" : "npm run dev:demo",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
