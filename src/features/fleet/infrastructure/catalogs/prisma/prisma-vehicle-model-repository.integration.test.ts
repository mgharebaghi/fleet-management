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
import { PrismaVehicleModelRepository } from "./prisma-vehicle-model-repository";

config({
  path: resolve(process.cwd(), ".env"),
  override: false,
  quiet: true,
});

const developmentDatabaseIdentity = {
  server: process.env.DATABASE_SERVER?.trim().toLowerCase(),
  port: process.env.DATABASE_PORT?.trim() || "1433",
  database: process.env.DATABASE_NAME?.trim().toLowerCase(),
};

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

if (
  developmentDatabaseIdentity.server === testMssqlConfig.server.toLowerCase() &&
  developmentDatabaseIdentity.port === String(testMssqlConfig.port) &&
  developmentDatabaseIdentity.database ===
    configuredTestDatabaseName.toLowerCase()
) {
  throw new Error("The integration test database must differ from development.");
}

const testPrismaClient = new PrismaClient({
  adapter: new PrismaMssql(testMssqlConfig),
});
const vehicleModelRepository = new PrismaVehicleModelRepository(
  testPrismaClient,
);
const createdModelIds = new Set<number>();
const createdBrandIds = new Set<number>();
const createdVehicleTypeIds = new Set<number>();
const createdFuelTypeIds = new Set<number>();

async function createReferences(options?: { isActive?: boolean }) {
  const token = randomUUID();
  const isActive = options?.isActive ?? true;
  const brand = await testPrismaClient.vehicleBrand.create({
    data: { BrandName: `IT-Brand-${token}`, IsActive: isActive },
  });
  createdBrandIds.add(brand.BrandId);

  const vehicleType = await testPrismaClient.vehicleType.create({
    data: { TypeName: `IT-Type-${token}`, IsActive: isActive },
  });
  createdVehicleTypeIds.add(vehicleType.VehicleTypeId);

  const fuelType = await testPrismaClient.fuelType.create({
    data: { FuelTypeName: `IT-Fuel-${token}`, IsActive: isActive },
  });
  createdFuelTypeIds.add(fuelType.FuelTypeId);

  return { brand, vehicleType, fuelType };
}

describe.sequential("PrismaVehicleModelRepository integration", () => {
  beforeAll(async () => {
    await testPrismaClient.$connect();

    const databaseIdentity = await testPrismaClient.$queryRaw<
      Array<{
        DatabaseName: string;
        VehicleModelTableId: number | null;
        VehicleBrandTableId: number | null;
        VehicleTypeTableId: number | null;
        FuelTypeTableId: number | null;
      }>
    >`SELECT
        DB_NAME() AS DatabaseName,
        OBJECT_ID(N'fleet.VehicleModel') AS VehicleModelTableId,
        OBJECT_ID(N'fleet.VehicleBrand') AS VehicleBrandTableId,
        OBJECT_ID(N'fleet.VehicleType') AS VehicleTypeTableId,
        OBJECT_ID(N'fleet.FuelType') AS FuelTypeTableId`;
    const [database] = databaseIdentity;

    if (
      !database ||
      database.DatabaseName.toLowerCase() !==
        configuredTestDatabaseName.toLowerCase() ||
      database.VehicleModelTableId === null ||
      database.VehicleBrandTableId === null ||
      database.VehicleTypeTableId === null ||
      database.FuelTypeTableId === null
    ) {
      throw new Error(
        "The configured integration test database identity is invalid.",
      );
    }
  });

  afterEach(async () => {
    await testPrismaClient.vehicleModel.deleteMany({
      where: { ModelId: { in: [...createdModelIds] } },
    });
    await testPrismaClient.vehicleBrand.deleteMany({
      where: { BrandId: { in: [...createdBrandIds] } },
    });
    await testPrismaClient.vehicleType.deleteMany({
      where: { VehicleTypeId: { in: [...createdVehicleTypeIds] } },
    });
    await testPrismaClient.fuelType.deleteMany({
      where: { FuelTypeId: { in: [...createdFuelTypeIds] } },
    });

    createdModelIds.clear();
    createdBrandIds.clear();
    createdVehicleTypeIds.clear();
    createdFuelTypeIds.clear();
  });

  afterAll(async () => {
    await testPrismaClient.$disconnect();
  });

  it("lists a vehicle model with its complete application relation shape", async () => {
    const { brand, vehicleType, fuelType } = await createReferences();
    const modelName = `IT-Model-${randomUUID()}`;
    const vehicleModel = await testPrismaClient.vehicleModel.create({
      data: {
        ModelName: modelName,
        BrandId: brand.BrandId,
        VehicleTypeId: vehicleType.VehicleTypeId,
        FuelTypeId: fuelType.FuelTypeId,
        IsActive: false,
      },
    });
    createdModelIds.add(vehicleModel.ModelId);

    const result = await vehicleModelRepository.list();

    expect(result).toContainEqual({
      id: vehicleModel.ModelId,
      name: modelName,
      isActive: false,
      brand: { id: brand.BrandId, name: brand.BrandName },
      vehicleType: {
        id: vehicleType.VehicleTypeId,
        name: vehicleType.TypeName,
      },
      fuelType: { id: fuelType.FuelTypeId, name: fuelType.FuelTypeName },
    });
  });

  it("orders vehicle models by ModelId descending, newest first", async () => {
    const { brand, vehicleType, fuelType } = await createReferences();

    const olderModel = await testPrismaClient.vehicleModel.create({
      data: {
        ModelName: `IT-Model-${randomUUID()}`,
        BrandId: brand.BrandId,
        VehicleTypeId: vehicleType.VehicleTypeId,
        FuelTypeId: fuelType.FuelTypeId,
      },
    });
    createdModelIds.add(olderModel.ModelId);

    const newerModel = await testPrismaClient.vehicleModel.create({
      data: {
        ModelName: `IT-Model-${randomUUID()}`,
        BrandId: brand.BrandId,
        VehicleTypeId: vehicleType.VehicleTypeId,
        FuelTypeId: fuelType.FuelTypeId,
      },
    });
    createdModelIds.add(newerModel.ModelId);

    expect(newerModel.ModelId).toBeGreaterThan(olderModel.ModelId);

    const result = await vehicleModelRepository.list();
    const newerIndex = result.findIndex(
      (vehicleModel) => vehicleModel.id === newerModel.ModelId,
    );
    const olderIndex = result.findIndex(
      (vehicleModel) => vehicleModel.id === olderModel.ModelId,
    );

    expect(newerIndex).toBeGreaterThanOrEqual(0);
    expect(olderIndex).toBeGreaterThanOrEqual(0);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  it("maps nullable vehicle type and fuel type relations to null", async () => {
    const { brand } = await createReferences();
    const modelName = `IT-Model-${randomUUID()}`;
    const vehicleModel = await testPrismaClient.vehicleModel.create({
      data: {
        ModelName: modelName,
        BrandId: brand.BrandId,
        VehicleTypeId: null,
        FuelTypeId: null,
      },
    });
    createdModelIds.add(vehicleModel.ModelId);

    const result = await vehicleModelRepository.list();

    expect(result).toContainEqual({
      id: vehicleModel.ModelId,
      name: modelName,
      isActive: true,
      brand: { id: brand.BrandId, name: brand.BrandName },
      vehicleType: null,
      fuelType: null,
    });
  });

  it("creates a complete vehicle model and preserves database-managed defaults", async () => {
    const { brand, vehicleType, fuelType } = await createReferences();
    const modelName = `IT-Model-${randomUUID()}`;

    const result = await vehicleModelRepository.create({
      name: modelName,
      brandId: brand.BrandId,
      vehicleTypeId: vehicleType.VehicleTypeId,
      fuelTypeId: fuelType.FuelTypeId,
    });
    createdModelIds.add(result.id);

    expect(result).toEqual({
      id: expect.any(Number),
      name: modelName,
      isActive: true,
      brand: { id: brand.BrandId, name: brand.BrandName },
      vehicleType: {
        id: vehicleType.VehicleTypeId,
        name: vehicleType.TypeName,
      },
      fuelType: { id: fuelType.FuelTypeId, name: fuelType.FuelTypeName },
    });

    const persistedVehicleModel =
      await testPrismaClient.vehicleModel.findUnique({
        where: { ModelId: result.id },
      });
    expect(persistedVehicleModel).toMatchObject({
      ModelId: result.id,
      ModelName: modelName,
      BrandId: brand.BrandId,
      VehicleTypeId: vehicleType.VehicleTypeId,
      FuelTypeId: fuelType.FuelTypeId,
      IsActive: true,
    });
  });

  it("detects existing inactive references and returns false for missing ids", async () => {
    const { brand, vehicleType, fuelType } = await createReferences({
      isActive: false,
    });

    await expect(
      vehicleModelRepository.brandExists(brand.BrandId),
    ).resolves.toBe(true);
    await expect(vehicleModelRepository.brandExists(0)).resolves.toBe(false);
    await expect(
      vehicleModelRepository.vehicleTypeExists(vehicleType.VehicleTypeId),
    ).resolves.toBe(true);
    await expect(vehicleModelRepository.vehicleTypeExists(0)).resolves.toBe(
      false,
    );
    await expect(
      vehicleModelRepository.fuelTypeExists(fuelType.FuelTypeId),
    ).resolves.toBe(true);
    await expect(vehicleModelRepository.fuelTypeExists(0)).resolves.toBe(
      false,
    );
  });

  it("lets SQL Server reject a create with an invalid foreign key", async () => {
    await expect(
      vehicleModelRepository.create({
        name: `IT-Model-${randomUUID()}`,
        brandId: 0,
        vehicleTypeId: 0,
        fuelTypeId: 0,
      }),
    ).rejects.toBeDefined();
  });

  it("updates a vehicle model's name, references, and active flag", async () => {
    const references = await createReferences();
    const created = await vehicleModelRepository.create({
      name: `IT-Model-${randomUUID()}`,
      brandId: references.brand.BrandId,
      vehicleTypeId: references.vehicleType.VehicleTypeId,
      fuelTypeId: references.fuelType.FuelTypeId,
    });
    createdModelIds.add(created.id);

    const otherReferences = await createReferences();
    const renamedName = `IT-Model-${randomUUID()}`;
    const updated = await vehicleModelRepository.update(created.id, {
      name: renamedName,
      brandId: otherReferences.brand.BrandId,
      vehicleTypeId: otherReferences.vehicleType.VehicleTypeId,
      fuelTypeId: otherReferences.fuelType.FuelTypeId,
      isActive: false,
    });

    expect(updated).toEqual({
      id: created.id,
      name: renamedName,
      isActive: false,
      brand: {
        id: otherReferences.brand.BrandId,
        name: otherReferences.brand.BrandName,
      },
      vehicleType: {
        id: otherReferences.vehicleType.VehicleTypeId,
        name: otherReferences.vehicleType.TypeName,
      },
      fuelType: {
        id: otherReferences.fuelType.FuelTypeId,
        name: otherReferences.fuelType.FuelTypeName,
      },
    });
  });

  it("rejects updating a vehicle model that no longer exists", async () => {
    const references = await createReferences();

    await expect(
      vehicleModelRepository.update(999999999, {
        name: "IT-missing",
        brandId: references.brand.BrandId,
        vehicleTypeId: references.vehicleType.VehicleTypeId,
        fuelTypeId: references.fuelType.FuelTypeId,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(CatalogEntryNotFoundError);
  });

  it("deletes an unreferenced vehicle model, and rejects deleting one referenced by a vehicle", async () => {
    const references = await createReferences();
    const deletable = await vehicleModelRepository.create({
      name: `IT-Model-${randomUUID()}`,
      brandId: references.brand.BrandId,
      vehicleTypeId: references.vehicleType.VehicleTypeId,
      fuelTypeId: references.fuelType.FuelTypeId,
    });

    await vehicleModelRepository.remove(deletable.id);
    await expect(
      testPrismaClient.vehicleModel.findUnique({
        where: { ModelId: deletable.id },
      }),
    ).resolves.toBeNull();

    const referenced = await vehicleModelRepository.create({
      name: `IT-Model-${randomUUID()}`,
      brandId: references.brand.BrandId,
      vehicleTypeId: references.vehicleType.VehicleTypeId,
      fuelTypeId: references.fuelType.FuelTypeId,
    });
    createdModelIds.add(referenced.id);
    const status = await testPrismaClient.vehicleStatus.create({
      data: { StatusName: `IT-Status-${randomUUID()}` },
    });
    const vehicle = await testPrismaClient.vehicle.create({
      data: {
        VehicleCode: `IT-${randomUUID().slice(0, 20)}`,
        PlateNoLeftSide: "11",
        ModelId: referenced.id,
        VehicleStatusId: status.VehicleStatusId,
      },
    });

    try {
      await expect(
        vehicleModelRepository.remove(referenced.id),
      ).rejects.toBeInstanceOf(CatalogEntryInUseError);
    } finally {
      await testPrismaClient.vehicle.delete({
        where: { VehicleId: vehicle.VehicleId },
      });
      await testPrismaClient.vehicleStatus.delete({
        where: { VehicleStatusId: status.VehicleStatusId },
      });
    }
  });
});
