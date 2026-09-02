import { describe, expect, it } from "vitest";

import { createMssqlConfigFromEnvironment } from "./mssql-config";

describe("createMssqlConfigFromEnvironment", () => {
  it("builds an mssql config object from the selected environment", () => {
    const environment = {
      TEST_DATABASE_SERVER: "integration-host",
      TEST_DATABASE_PORT: "1444",
      TEST_DATABASE_NAME: "FleetManagementDB_IntegrationTest",
      TEST_DATABASE_USER: "integration-user",
      TEST_DATABASE_PASSWORD: "integration-password",
      TEST_DATABASE_ENCRYPT: "false",
      TEST_DATABASE_TRUST_SERVER_CERTIFICATE: "true",
    };

    expect(
      createMssqlConfigFromEnvironment("TEST_DATABASE", environment),
    ).toEqual({
      server: "integration-host",
      port: 1444,
      database: "FleetManagementDB_IntegrationTest",
      user: "integration-user",
      password: "integration-password",
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
    });
  });

  it("uses secure connection defaults when optional settings are absent", () => {
    const environment = {
      DATABASE_SERVER: "development-host",
      DATABASE_NAME: "FleetManagementDB",
      DATABASE_USER: "development-user",
      DATABASE_PASSWORD: "development-password",
    };

    expect(createMssqlConfigFromEnvironment("DATABASE", environment)).toEqual({
      server: "development-host",
      port: 1433,
      database: "FleetManagementDB",
      user: "development-user",
      password: "development-password",
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
    });
  });

  it("rejects missing credentials before the adapter is created", () => {
    const environment = {
      E2E_DATABASE_SERVER: "e2e-host",
      E2E_DATABASE_NAME: "FleetManagementDB_E2ETest",
      E2E_DATABASE_USER: "e2e-user",
    };

    expect(() =>
      createMssqlConfigFromEnvironment("E2E_DATABASE", environment),
    ).toThrow("E2E_DATABASE_PASSWORD is required to connect to SQL Server.");
  });

  it("rejects invalid port and boolean settings", () => {
    const environment = {
      DATABASE_SERVER: "development-host",
      DATABASE_PORT: "70000",
      DATABASE_NAME: "FleetManagementDB",
      DATABASE_USER: "development-user",
      DATABASE_PASSWORD: "development-password",
      DATABASE_ENCRYPT: "yes",
    };

    expect(() =>
      createMssqlConfigFromEnvironment("DATABASE", environment),
    ).toThrow("DATABASE_PORT must be a valid TCP port.");

    environment.DATABASE_PORT = "1433";

    expect(() =>
      createMssqlConfigFromEnvironment("DATABASE", environment),
    ).toThrow("DATABASE_ENCRYPT must be either true or false.");
  });
});
