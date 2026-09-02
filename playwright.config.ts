import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

import { createMssqlConfigFromEnvironment } from "./src/infrastructure/database/prisma/mssql-config";

loadEnv({ path: ".env", override: false, quiet: true });
const developmentDatabaseServer = process.env.DATABASE_SERVER;
const developmentDatabasePort = process.env.DATABASE_PORT?.trim() || "1433";
const developmentDatabaseName = process.env.DATABASE_NAME;

loadEnv({ path: ".env.test.local", override: false, quiet: true });
const integrationDatabaseServer = process.env.TEST_DATABASE_SERVER;
const integrationDatabasePort =
  process.env.TEST_DATABASE_PORT?.trim() || "1433";
const integrationDatabaseName = process.env.TEST_DATABASE_NAME;

loadEnv({ path: ".env.e2e.local", override: false, quiet: true });
const e2eMssqlConfig = createMssqlConfigFromEnvironment("E2E_DATABASE");

const expectedE2EDatabaseName = "FleetManagementDB_E2ETest";
const configuredE2EDatabaseName = e2eMssqlConfig.database;

if (
  configuredE2EDatabaseName.toLowerCase() !==
  expectedE2EDatabaseName.toLowerCase()
) {
  throw new Error(
    `E2E_DATABASE_NAME must be ${expectedE2EDatabaseName}.`,
  );
}

if (
  [
    {
      server: developmentDatabaseServer,
      port: developmentDatabasePort,
      database: developmentDatabaseName,
    },
    {
      server: integrationDatabaseServer,
      port: integrationDatabasePort,
      database: integrationDatabaseName,
    },
  ].some(
    ({ server, port, database }) =>
      server?.toLowerCase() === e2eMssqlConfig.server.toLowerCase() &&
      port === String(e2eMssqlConfig.port) &&
      database?.toLowerCase() === configuredE2EDatabaseName.toLowerCase(),
  )
) {
  throw new Error(
    "The E2E database must be different from development and integration databases.",
  );
}

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
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_SERVER: e2eMssqlConfig.server,
      DATABASE_PORT: String(e2eMssqlConfig.port),
      DATABASE_NAME: e2eMssqlConfig.database,
      DATABASE_USER: e2eMssqlConfig.user,
      DATABASE_PASSWORD: e2eMssqlConfig.password,
      DATABASE_ENCRYPT: String(e2eMssqlConfig.options.encrypt),
      DATABASE_TRUST_SERVER_CERTIFICATE: String(
        e2eMssqlConfig.options.trustServerCertificate,
      ),
    },
  },
});
