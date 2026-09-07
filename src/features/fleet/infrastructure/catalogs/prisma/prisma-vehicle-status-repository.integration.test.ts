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

  it("renames a vehicle status and rejects updating one that no longer exists", async () => {
    const created = await vehicleStatusRepository.create(
      `IT-${randomUUID().slice(0, 30)}`,
    );
    createdVehicleStatusIds.add(created.id);

    const renamedName = `IT-${randomUUID().slice(0, 30)}`;
    const renamed = await vehicleStatusRepository.update(created.id, {
      name: renamedName,
    });
    expect(renamed).toEqual({ id: created.id, name: renamedName });

    await expect(
      vehicleStatusRepository.update(999999999, { name: "IT-missing" }),
    ).rejects.toBeInstanceOf(CatalogEntryNotFoundError);
  });

  it("deletes an unreferenced vehicle status, and rejects deleting one referenced by a vehicle", async () => {
    const deletable = await vehicleStatusRepository.create(
      `IT-${randomUUID().slice(0, 30)}`,
    );
    await vehicleStatusRepository.remove(deletable.id);
    await expect(
      testPrismaClient.vehicleStatus.findUnique({
        where: { VehicleStatusId: deletable.id },
      }),
    ).resolves.toBeNull();

    const referenced = await vehicleStatusRepository.create(
      `IT-${randomUUID().slice(0, 30)}`,
    );
    createdVehicleStatusIds.add(referenced.id);
    const brand = await testPrismaClient.vehicleBrand.create({
      data: { BrandName: `IT-${randomUUID()}` },
    });
    const model = await testPrismaClient.vehicleModel.create({
      data: { ModelName: `IT-${randomUUID()}`, BrandId: brand.BrandId },
    });
    const vehicle = await testPrismaClient.vehicle.create({
      data: {
        VehicleCode: `IT-${randomUUID().slice(0, 20)}`,
        PlateNoLeftSide: "11",
        ModelId: model.ModelId,
        VehicleStatusId: referenced.id,
      },
    });

    try {
      await expect(
        vehicleStatusRepository.remove(referenced.id),
      ).rejects.toBeInstanceOf(CatalogEntryInUseError);
    } finally {
      await testPrismaClient.vehicle.delete({
        where: { VehicleId: vehicle.VehicleId },
      });
      await testPrismaClient.vehicleModel.delete({
        where: { ModelId: model.ModelId },
      });
      await testPrismaClient.vehicleBrand.delete({
        where: { BrandId: brand.BrandId },
      });
    }
  });
});
