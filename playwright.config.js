const { defineConfig, devices } = require("@playwright/test");

// Runs against the real backend + frontend dev servers. Locally, Playwright
// starts both itself (reusing ones already running, e.g. from `npm run
// dev` in each package) so `npx playwright test` just works standalone;
// in CI, .github/workflows/ci.yml starts them as separate steps (mongo
// service container, backend, built+previewed frontend) and waits on
// /health before this config's webServer is skipped entirely.
module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "npm run dev",
          cwd: "./backend",
          url: "http://localhost:3000/health",
          reuseExistingServer: true,
          timeout: 30000,
        },
        {
          command: "npm run dev",
          cwd: "./frontend",
          url: "http://localhost:5173",
          reuseExistingServer: true,
          timeout: 30000,
        },
      ],
});
