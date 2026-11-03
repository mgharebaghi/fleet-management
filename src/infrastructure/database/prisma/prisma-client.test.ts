import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(function () {}), adapter: vi.fn(function () {}), config: { server: "synthetic-host" } }));
vi.mock("@prisma/adapter-mssql", () => ({ PrismaMssql: mocks.adapter }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: mocks.client }));
vi.mock("@/infrastructure/database/prisma/mssql-config", () => ({ createMssqlConfigFromEnvironment: () => mocks.config }));

afterEach(() => { delete (globalThis as { fleetManagementPrismaClient?: unknown }).fleetManagementPrismaClient; });

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete (globalThis as { fleetManagementPrismaClient?: unknown }).fleetManagementPrismaClient;
});

it("allows bounded cold-pool startup time without extending the transaction execution timeout", async () => {
  await import("./prisma-client");
  expect(mocks.adapter).toHaveBeenCalledWith(mocks.config);
  expect(mocks.client).toHaveBeenCalledWith({ adapter: expect.anything(), transactionOptions: { maxWait: 15000 } });
});
