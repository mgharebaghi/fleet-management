import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { config } from "dotenv";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../../infrastructure/database/prisma/mssql-config";
import { PrismaVehicleTypeRepository } from "./prisma-vehicle-type-repository";

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
const vehicleTypeRepository = new PrismaVehicleTypeRepository(
  testPrismaClient,
);
const createdVehicleTypeIds = new Set<number>();

describe.sequential("PrismaVehicleTypeRepository integration", () => {
  beforeAll(async () => {
    await testPrismaClient.$connect();

    const databaseIdentity = await testPrismaClient.$queryRaw<
      Array<{ DatabaseName: string; VehicleTypeTableId: number | null }>
    >`SELECT DB_NAME() AS DatabaseName, OBJECT_ID(N'fleet.VehicleType') AS VehicleTypeTableId`;
    const [database] = databaseIdentity;

    if (
      !database ||
      database.DatabaseName.toLowerCase() !==
        configuredTestDatabaseName.toLowerCase() ||
      database.VehicleTypeTableId === null
    ) {
      throw new Error(
        "The configured integration test database identity is invalid.",
      );
    }
  });

  afterEach(async () => {
    for (const vehicleTypeId of createdVehicleTypeIds) {
      await testPrismaClient.vehicleType.deleteMany({
        where: { VehicleTypeId: vehicleTypeId },
      });
    }

    createdVehicleTypeIds.clear();
  });

  afterAll(async () => {
    await testPrismaClient.$disconnect();
  });

  it("creates a vehicle type, maps it, and detects it by name afterward", async () => {
    const name = `IT-${randomUUID()}`;

    await expect(vehicleTypeRepository.existsByName(name)).resolves.toBe(
      false,
    );

    const createdVehicleType = await vehicleTypeRepository.create(name);
    createdVehicleTypeIds.add(createdVehicleType.id);

    expect(createdVehicleType).toEqual({
      id: expect.any(Number),
      name,
      isActive: true,
    });

    const persistedVehicleType = await testPrismaClient.vehicleType.findUnique(
      { where: { VehicleTypeId: createdVehicleType.id } },
    );
    expect(persistedVehicleType).toMatchObject({
      VehicleTypeId: createdVehicleType.id,
      TypeName: name,
      IsActive: true,
    });

    await expect(vehicleTypeRepository.existsByName(name)).resolves.toBe(
      true,
    );

    const listedVehicleTypes = await vehicleTypeRepository.list();
    expect(listedVehicleTypes).toContainEqual(createdVehicleType);
  });
});
