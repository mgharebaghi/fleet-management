import { config } from "dotenv";
import { createMssqlConfigFromEnvironment } from "../../infrastructure/database/prisma/mssql-config";

type TestPrefix = "TEST_DATABASE" | "E2E_DATABASE";
type Environment = Readonly<Record<string, string | undefined>>;

export function createTestDatabaseConfig(prefix: TestPrefix, environment: Environment) {
  const connection = createMssqlConfigFromEnvironment(prefix, environment);
  const expected = prefix === "TEST_DATABASE"
    ? "FleetManagementDB_IntegrationTest"
    : "FleetManagementDB_E2ETest";
  if (connection.database.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${prefix}_NAME must be ${expected}.`);
  }
  for (const other of ["DATABASE", prefix === "TEST_DATABASE" ? "E2E_DATABASE" : "TEST_DATABASE"]) {
    if (
      environment[`${other}_SERVER`]?.trim().toLowerCase() === connection.server.toLowerCase() &&
      Number(environment[`${other}_PORT`]?.trim() || "1433") === connection.port &&
      environment[`${other}_NAME`]?.trim().toLowerCase() === connection.database.toLowerCase()
    ) {
      throw new Error("Development, integration and E2E databases must be isolated.");
    }
  }
  return connection;
}

export function loadTestDatabaseConfig(prefix: TestPrefix) {
  for (const path of [".env", ".env.test.local", ".env.e2e.local"]) {
    config({ path, override: false, quiet: true });
  }
  return createTestDatabaseConfig(prefix, process.env);
}
