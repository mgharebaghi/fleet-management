import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { config } from "dotenv";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../../infrastructure/database/prisma/mssql-config";
import { PrismaVehicleStatusRepository } from "./prisma-vehicle-status-repository";

config({
  path: resolve(process.cwd(), ".env.test.local"),
  override: false,
  quiet: true,
});

const testMssqlConfig = createMssqlConfigFromEnvironment("TEST_DATABASE");
const configuredTestDatabaseName = testMssqlConfig.database;

if (!configuredTestDatabaseName.toLowerCase().includes("integrationtest")) {
  throw new Error("TEST_DATABASE_NAME must contain IntegrationTest.");
}

const testPrismaClient = new PrismaClient({
  adapter: new PrismaMssql(testMssqlConfig),
});
const vehicleStatusRepository = new PrismaVehicleStatusRepository(
  testPrismaClient,
);
const createdVehicleStatusIds = new Set<number>();

describe.sequential("PrismaVehicleStatusRepository integration", () => {
  beforeAll(async () => {
    await testPrismaClient.$connect();

    const databaseIdentity = await testPrismaClient.$queryRaw<
      Array<{ DatabaseName: string; VehicleStatusTableId: number | null }>
    >`SELECT DB_NAME() AS DatabaseName, OBJECT_ID(N'fleet.VehicleStatus') AS VehicleStatusTableId`;
    const [database] = databaseIdentity;

    if (
      !database ||
      database.DatabaseName.toLowerCase() !==
        configuredTestDatabaseName.toLowerCase() ||
      database.VehicleStatusTableId === null
    ) {
      throw new Error(
        "The configured integration test database identity is invalid.",
      );
    }
  });

  afterEach(async () => {
    for (const vehicleStatusId of createdVehicleStatusIds) {
      await testPrismaClient.vehicleStatus.deleteMany({
        where: { VehicleStatusId: vehicleStatusId },
      });
    }

    createdVehicleStatusIds.clear();
  });

  afterAll(async () => {
    await testPrismaClient.$disconnect();
  });

  it("creates a vehicle status, maps it without an isActive field, and detects it by name afterward", async () => {
    const name = `IT-${randomUUID().slice(0, 30)}`;

    await expect(vehicleStatusRepository.existsByName(name)).resolves.toBe(
      false,
    );

    const createdVehicleStatus = await vehicleStatusRepository.create(name);
    createdVehicleStatusIds.add(createdVehicleStatus.id);

    expect(createdVehicleStatus).toEqual({ id: expect.any(Number), name });
    expect(createdVehicleStatus).not.toHaveProperty("isActive");

    const persistedVehicleStatus =
      await testPrismaClient.vehicleStatus.findUnique({
        where: { VehicleStatusId: createdVehicleStatus.id },
      });
    expect(persistedVehicleStatus).toMatchObject({
      VehicleStatusId: createdVehicleStatus.id,
      StatusName: name,
    });

    await expect(vehicleStatusRepository.existsByName(name)).resolves.toBe(
      true,
    );

    const listedVehicleStatuses = await vehicleStatusRepository.list();
    expect(listedVehicleStatuses).toContainEqual(createdVehicleStatus);
  });
});
