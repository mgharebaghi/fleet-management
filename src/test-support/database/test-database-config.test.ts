import { describe, expect, it } from "vitest";
import { createTestDatabaseConfig } from "./test-database-config";

const environment = {
  TEST_DATABASE_SERVER: "localhost",
  TEST_DATABASE_NAME: "FleetManagementDB_IntegrationTest",
  TEST_DATABASE_USER: "test-user",
  TEST_DATABASE_PASSWORD: "synthetic-password",
  E2E_DATABASE_SERVER: "localhost",
  E2E_DATABASE_NAME: "FleetManagementDB_E2ETest",
  E2E_DATABASE_USER: "test-user",
  E2E_DATABASE_PASSWORD: "synthetic-password",
};

describe("isolated test database configuration", () => {
  it.each(["TEST_DATABASE", "E2E_DATABASE"] as const)("requires dedicated settings for %s", prefix => {
    expect(() => createTestDatabaseConfig(prefix, {})).toThrow(`${prefix}_SERVER`);
    expect(() => createTestDatabaseConfig(prefix, { DATABASE_SERVER: "dev" })).toThrow(`${prefix}_SERVER`);
    expect(createTestDatabaseConfig(prefix, environment).database).toBe(environment[`${prefix}_NAME`]);
  });
  it.each(["Production", "Development", "AnotherIntegrationTest"])("rejects a misleading or unsafe database name %s", name => {
    expect(() => createTestDatabaseConfig("TEST_DATABASE", { ...environment, TEST_DATABASE_NAME: name })).toThrow("TEST_DATABASE_NAME must be");
  });
  it.each(["TEST_DATABASE", "E2E_DATABASE"] as const)("rejects the development database for %s", prefix => {
    expect(() => createTestDatabaseConfig(prefix, {
      ...environment,
      DATABASE_SERVER: " LOCALHOST ",
      DATABASE_PORT: "01433",
      DATABASE_NAME: environment[`${prefix}_NAME`].toUpperCase(),
    })).toThrow("must be isolated");
  });
  it("rejects identical integration and E2E targets", () => {
    expect(() => createTestDatabaseConfig("TEST_DATABASE", {
      ...environment, E2E_DATABASE_NAME: environment.TEST_DATABASE_NAME,
    })).toThrow("must be isolated");
  });
  it("does not require development credentials on CI", () => {
    expect(createTestDatabaseConfig("TEST_DATABASE", environment).port).toBe(1433);
  });
});
