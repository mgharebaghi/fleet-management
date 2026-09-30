import { defineConfig, devices } from "@playwright/test";

import { loadTestDatabaseConfig } from "./src/test-support/database/test-database-config";

const e2eMssqlConfig = loadTestDatabaseConfig("E2E_DATABASE");

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: "test-results",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // CI's self-hosted runner cannot download the Playwright-managed
        // Chromium build (cdn.playwright.dev is blocked), so CI drives the
        // system-installed Google Chrome via Playwright's channel support
        // instead. Local development keeps the default bundled Chromium.
        ...(process.env.CI ? { channel: "chrome" } : {}),
      },
    },
  ],
  webServer: {
    // output: "standalone" (see next.config.ts) means "next start" cannot
    // serve the build; run the traced server.js instead, same as the Docker
    // runtime image.
    command: "npm run build && npm start",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      HOSTNAME: "127.0.0.1",
      PORT: "3100",
      DATABASE_SERVER: e2eMssqlConfig.server,
      DATABASE_PORT: String(e2eMssqlConfig.port),
      DATABASE_NAME: e2eMssqlConfig.database,
      DATABASE_USER: e2eMssqlConfig.user,
      DATABASE_PASSWORD: e2eMssqlConfig.password,
      DATABASE_ENCRYPT: String(e2eMssqlConfig.options.encrypt),
      DATABASE_TRUST_SERVER_CERTIFICATE: String(
        e2eMssqlConfig.options.trustServerCertificate,
      ),
      // Location creation must stay manual when Neshan is not configured.
      // Empty values override any developer keys loaded from .env.
      NEXT_PUBLIC_NESHAN_MAP_KEY: "",
      NESHAN_SERVICE_API_KEY: "",
    },
  },
});
