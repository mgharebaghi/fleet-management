import { beforeEach, describe, expect, it, vi } from "vitest";

import expectedContract from "./maintenance-inventory-contract.json";
import {
  normalizeMaintenanceInventoryMetadata,
  readIsolatedMaintenanceInventoryContract,
  type MaintenanceInventoryMetadata,
} from "./maintenance-inventory-contract";

const mocks = vi.hoisted(() => ({
  configuration: vi.fn(),
  construct: vi.fn(),
  connect: vi.fn(),
  query: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock("./test-database-config", () => ({ loadTestDatabaseConfig: mocks.configuration }));
vi.mock("@prisma/adapter-mssql", () => ({
  PrismaMssql: class {
    constructor() { mocks.construct(); }
    connect = mocks.connect;
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.configuration.mockReturnValue({ database: "FleetManagementDB_IntegrationTest" });
  mocks.connect.mockResolvedValue({
    underlyingDriver: () => ({ request: () => ({ query: mocks.query }) }),
    dispose: mocks.dispose,
  });
  mocks.query.mockResolvedValueOnce({
    recordset: [{ databaseName: "FleetManagementDB_IntegrationTest", canViewDefinition: 1 }],
  });
});

describe("read-only maintenance and inventory contract gate", () => {
  it("fails before connecting when the shared isolation guard rejects configuration", async () => {
    mocks.configuration.mockImplementation(() => { throw new Error("Test databases must be isolated."); });
    await expect(readIsolatedMaintenanceInventoryContract("TEST_DATABASE")).rejects.toThrow("must be isolated");
    expect(mocks.construct).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("checks live identity before reading metadata and closes a mismatched connection", async () => {
    mocks.query.mockReset().mockResolvedValueOnce({
      recordset: [{ databaseName: "FleetManagementDB_Development", canViewDefinition: 1 }],
    });
    await expect(readIsolatedMaintenanceInventoryContract("TEST_DATABASE")).rejects.toThrow("identity");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it("does not report a matching contract when metadata visibility is missing", async () => {
    mocks.query.mockReset().mockResolvedValueOnce({
      recordset: [{ databaseName: "FleetManagementDB_IntegrationTest", canViewDefinition: 0 }],
    });
    await expect(readIsolatedMaintenanceInventoryContract("TEST_DATABASE")).rejects.toThrow("VIEW DEFINITION");
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it("reports login failure without leaking the driver configuration or falling back", async () => {
    mocks.connect.mockRejectedValue(Object.assign(new Error("password=synthetic-secret"), {
      code: "ELOGIN", config: { password: "synthetic-secret" },
    }));
    const error = await readIsolatedMaintenanceInventoryContract("E2E_DATABASE").catch(error => error as Error);
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) throw new Error("Expected the connection to fail.");
    expect(error.message).toContain("E2E_DATABASE");
    expect(error.message).toContain("ELOGIN");
    expect(error.message).not.toContain("synthetic-secret");
    expect(error.cause).toBeUndefined();
    expect(mocks.connect).toHaveBeenCalledTimes(1);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("reads all six metadata sections using SELECT only, then closes the connection", async () => {
    mocks.query.mockResolvedValueOnce({ recordsets: Object.values(expectedContract) });
    await expect(readIsolatedMaintenanceInventoryContract("TEST_DATABASE")).resolves.toEqual(expectedContract);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    for (const [query] of mocks.query.mock.calls) {
      expect(query.trim()).toMatch(/^SELECT\b/);
      expect(query).not.toMatch(/\b(INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|EXEC)\b/i);
    }
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it("closes the connection when SQL Server metadata cannot be read", async () => {
    mocks.query.mockRejectedValueOnce(new Error("Metadata query failed."));
    await expect(readIsolatedMaintenanceInventoryContract("TEST_DATABASE")).rejects.toThrow("Metadata query failed");
    expect(mocks.dispose).toHaveBeenCalledTimes(1);
  });

  it("ignores generated constraint names but retains identity, computed columns and missing relations", () => {
    const restored = structuredClone(expectedContract) as MaintenanceInventoryMetadata;
    restored.foreignKeys.forEach(row => { row.constraintName = "restored-generated-name"; });
    restored.indexes.forEach(row => { row.indexName = "restored-generated-name"; });
    expect(normalizeMaintenanceInventoryMetadata(restored)).toEqual(expectedContract);

    const identity = restored.columns.find(row => row.tableName === "PartVehicleCompatibility" && row.columnName === "PartId")!;
    identity.isIdentity = false;
    expect(normalizeMaintenanceInventoryMetadata(restored)).not.toEqual(expectedContract);

    const computed = restored.columns.find(row => row.tableName === "WorkOrderPart" && row.columnName === "TotalPrice")!;
    expect(computed.computedDefinition).toBe("([Quantity]*[UnitPrice])");
    expect(computed.persistedComputed).toBe(true);
    expect(restored.foreignKeys.some(row => row.tableName === "WorkOrderPart" && row.columnName === "PartId")).toBe(false);
  });
});
