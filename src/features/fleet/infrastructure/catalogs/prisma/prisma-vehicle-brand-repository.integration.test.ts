import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { config } from "dotenv";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../../infrastructure/database/prisma/mssql-config";
import { PrismaVehicleBrandRepository } from "./prisma-vehicle-brand-repository";

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
const vehicleBrandRepository = new PrismaVehicleBrandRepository(
  testPrismaClient,
);
const createdBrandIds = new Set<number>();

describe.sequential("PrismaVehicleBrandRepository integration", () => {
  beforeAll(async () => {
    await testPrismaClient.$connect();

    const databaseIdentity = await testPrismaClient.$queryRaw<
      Array<{ DatabaseName: string; VehicleBrandTableId: number | null }>
    >`SELECT DB_NAME() AS DatabaseName, OBJECT_ID(N'fleet.VehicleBrand') AS VehicleBrandTableId`;
    const [database] = databaseIdentity;

    if (
      !database ||
      database.DatabaseName.toLowerCase() !==
        configuredTestDatabaseName.toLowerCase() ||
      database.VehicleBrandTableId === null
    ) {
      throw new Error(
        "The configured integration test database identity is invalid.",
      );
    }
  });

  afterEach(async () => {
    for (const brandId of createdBrandIds) {
      await testPrismaClient.vehicleBrand.deleteMany({
        where: { BrandId: brandId },
      });
    }

    createdBrandIds.clear();
  });

  afterAll(async () => {
    await testPrismaClient.$disconnect();
  });

  it("creates a vehicle brand, maps it, and detects it by name afterward", async () => {
    const name = `IT-${randomUUID()}`;

    await expect(vehicleBrandRepository.existsByName(name)).resolves.toBe(
      false,
    );

    const createdVehicleBrand = await vehicleBrandRepository.create(name);
    createdBrandIds.add(createdVehicleBrand.id);

    expect(createdVehicleBrand).toEqual({
      id: expect.any(Number),
      name,
      isActive: true,
    });

    const persistedVehicleBrand = await testPrismaClient.vehicleBrand.findUnique(
      { where: { BrandId: createdVehicleBrand.id } },
    );
    expect(persistedVehicleBrand).toMatchObject({
      BrandId: createdVehicleBrand.id,
      BrandName: name,
      IsActive: true,
    });

    await expect(vehicleBrandRepository.existsByName(name)).resolves.toBe(
      true,
    );

    const listedVehicleBrands = await vehicleBrandRepository.list();
    expect(listedVehicleBrands).toContainEqual(createdVehicleBrand);
  });
});
