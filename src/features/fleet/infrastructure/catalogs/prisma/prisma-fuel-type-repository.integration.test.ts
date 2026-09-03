import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { config } from "dotenv";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../../infrastructure/database/prisma/mssql-config";
import { PrismaFuelTypeRepository } from "./prisma-fuel-type-repository";

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
const fuelTypeRepository = new PrismaFuelTypeRepository(testPrismaClient);
const createdFuelTypeIds = new Set<number>();

describe.sequential("PrismaFuelTypeRepository integration", () => {
  beforeAll(async () => {
    await testPrismaClient.$connect();

    const databaseIdentity = await testPrismaClient.$queryRaw<
      Array<{ DatabaseName: string; FuelTypeTableId: number | null }>
    >`SELECT DB_NAME() AS DatabaseName, OBJECT_ID(N'fleet.FuelType') AS FuelTypeTableId`;
    const [database] = databaseIdentity;

    if (
      !database ||
      database.DatabaseName.toLowerCase() !==
        configuredTestDatabaseName.toLowerCase() ||
      database.FuelTypeTableId === null
    ) {
      throw new Error(
        "The configured integration test database identity is invalid.",
      );
    }
  });

  afterEach(async () => {
    for (const fuelTypeId of createdFuelTypeIds) {
      await testPrismaClient.fuelType.deleteMany({
        where: { FuelTypeId: fuelTypeId },
      });
    }

    createdFuelTypeIds.clear();
  });

  afterAll(async () => {
    await testPrismaClient.$disconnect();
  });

  it("creates a fuel type, maps it, and detects it by name afterward", async () => {
    const name = `IT-${randomUUID().slice(0, 30)}`;

    await expect(fuelTypeRepository.existsByName(name)).resolves.toBe(false);

    const createdFuelType = await fuelTypeRepository.create(name);
    createdFuelTypeIds.add(createdFuelType.id);

    expect(createdFuelType).toEqual({
      id: expect.any(Number),
      name,
      isActive: true,
    });

    const persistedFuelType = await testPrismaClient.fuelType.findUnique({
      where: { FuelTypeId: createdFuelType.id },
    });
    expect(persistedFuelType).toMatchObject({
      FuelTypeId: createdFuelType.id,
      FuelTypeName: name,
      IsActive: true,
    });

    await expect(fuelTypeRepository.existsByName(name)).resolves.toBe(true);

    const listedFuelTypes = await fuelTypeRepository.list();
    expect(listedFuelTypes).toContainEqual(createdFuelType);
  });
});
