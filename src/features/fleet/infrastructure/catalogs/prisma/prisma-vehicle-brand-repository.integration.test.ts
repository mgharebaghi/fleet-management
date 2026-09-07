import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { config } from "dotenv";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../../infrastructure/database/prisma/mssql-config";
import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
} from "../../../application/catalogs/ports/catalog-entry-writer";
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

  it("renames a vehicle brand and can toggle it inactive", async () => {
    const created = await vehicleBrandRepository.create(`IT-${randomUUID()}`);
    createdBrandIds.add(created.id);

    const renamedName = `IT-${randomUUID()}`;
    const renamed = await vehicleBrandRepository.update(created.id, {
      name: renamedName,
    });
    expect(renamed).toEqual({ id: created.id, name: renamedName, isActive: true });

    const deactivated = await vehicleBrandRepository.update(created.id, {
      name: renamedName,
      isActive: false,
    });
    expect(deactivated.isActive).toBe(false);
  });

  it("rejects updating a vehicle brand that no longer exists", async () => {
    await expect(
      vehicleBrandRepository.update(999999999, { name: "IT-missing" }),
    ).rejects.toBeInstanceOf(CatalogEntryNotFoundError);
  });

  it("excludes the entry's own id from an existsByName check", async () => {
    const name = `IT-${randomUUID()}`;
    const created = await vehicleBrandRepository.create(name);
    createdBrandIds.add(created.id);

    await expect(
      vehicleBrandRepository.existsByName(name, created.id),
    ).resolves.toBe(false);
    await expect(vehicleBrandRepository.existsByName(name)).resolves.toBe(
      true,
    );
  });

  it("deletes a vehicle brand that nothing references", async () => {
    const created = await vehicleBrandRepository.create(`IT-${randomUUID()}`);

    await vehicleBrandRepository.remove(created.id);

    await expect(
      testPrismaClient.vehicleBrand.findUnique({
        where: { BrandId: created.id },
      }),
    ).resolves.toBeNull();
  });

  it("rejects deleting a vehicle brand that no longer exists", async () => {
    await expect(
      vehicleBrandRepository.remove(999999999),
    ).rejects.toBeInstanceOf(CatalogEntryNotFoundError);
  });

  it("rejects deleting a vehicle brand still referenced by a vehicle model, without deleting either row", async () => {
    const created = await vehicleBrandRepository.create(`IT-${randomUUID()}`);
    createdBrandIds.add(created.id);
    const model = await testPrismaClient.vehicleModel.create({
      data: { ModelName: `IT-${randomUUID()}`, BrandId: created.id },
    });

    try {
      await expect(
        vehicleBrandRepository.remove(created.id),
      ).rejects.toBeInstanceOf(CatalogEntryInUseError);

      await expect(
        testPrismaClient.vehicleBrand.findUnique({
          where: { BrandId: created.id },
        }),
      ).resolves.not.toBeNull();
    } finally {
      await testPrismaClient.vehicleModel.delete({
        where: { ModelId: model.ModelId },
      });
    }
  });
});
