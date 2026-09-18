import { randomUUID } from "node:crypto";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../infrastructure/database/prisma/mssql-config";
import { ManageLocations } from "../../application/location/manage-locations";
import { PrismaLocationRepository } from "./prisma-location-repository";

const development = {
  server: process.env.DATABASE_SERVER?.toLowerCase(),
  port: process.env.DATABASE_PORT?.trim() || "1433",
  name: process.env.DATABASE_NAME?.toLowerCase(),
};
const connection = createMssqlConfigFromEnvironment("TEST_DATABASE");
if (
  !/integrationtest/i.test(connection.database) ||
  (connection.server.toLowerCase() === development.server &&
    String(connection.port) === development.port &&
    connection.database.toLowerCase() === development.name)
) {
  throw new Error(
    "Location integration tests require the isolated IntegrationTest database.",
  );
}

const client = new PrismaClient({
  adapter: new PrismaMssql({
    ...connection,
    connectionTimeout: 60_000,
    requestTimeout: 120_000,
  }),
});
const manage = new ManageLocations(new PrismaLocationRepository(client));
const locationIds: number[] = [];
let verified = false;

describe.sequential("Trip Location SQL Server integration", () => {
  beforeAll(async () => {
    const [identity] = await client.$queryRaw<
      Array<{ name: string; location: number | null }>
    >`SELECT DB_NAME() name, OBJECT_ID(N'common.Location') location`;
    if (
      !identity ||
      identity.name.toLowerCase() !== connection.database.toLowerCase() ||
      identity.location === null
    ) {
      throw new Error("Location IntegrationTest identity is invalid.");
    }
    verified = true;
  }, 180_000);

  afterEach(async () => {
    if (!verified) return;
    await client.location.deleteMany({
      where: { LocationId: { in: locationIds } },
    });
    expect(
      await client.location.count({
        where: { LocationId: { in: locationIds } },
      }),
    ).toBe(0);
    locationIds.length = 0;
  }, 180_000);

  afterAll(async () => {
    await client.$disconnect();
  });

  it(
    "creates exact Location values and rejects normalized duplicates",
    async () => {
      const token = randomUUID();
      const input = {
        locationName: ` مکان ${token} `,
        locationCode: ` loc-${token} `,
        locationType: " اداری ",
        address: " تهران   مرکزی ",
        latitude: "35.123456",
        longitude: "51.654321",
        description: " توضیح ",
      };
      const created = await manage.create(input);
      expect(created.success).toBe(true);
      if (!created.success) throw new Error(created.error);
      locationIds.push(created.location.locationId);
      expect(created.location).toMatchObject({
        locationName: `مکان ${token}`,
        locationCode: `LOC-${token}`.toUpperCase(),
        locationType: "اداری",
        address: "تهران مرکزی",
        isActive: true,
      });

      const [stored] = await client.$queryRaw<
        Array<{
          latitude: string | null;
          longitude: string | null;
          description: string | null;
        }>
      >`SELECT
          CONVERT(varchar(40), Latitude) latitude,
          CONVERT(varchar(40), Longitude) longitude,
          Description description
        FROM common.Location
        WHERE LocationId=${created.location.locationId}`;
      expect(stored).toEqual({
        latitude: "35.123456",
        longitude: "51.654321",
        description: "توضیح",
      });

      const duplicateCode = await manage.create({
        ...input,
        locationName: "نام دیگر",
        locationCode: ` loc-${token.toUpperCase()} `,
      });
      expect(duplicateCode).toMatchObject({
        success: false,
        error: "LOCATION_CODE_DUPLICATE",
      });

      const duplicateNameAddress = await manage.create({
        ...input,
        locationCode: null,
        locationName: `مكان ${token}`,
        address: "تهران مرکزی",
      });
      expect(duplicateNameAddress).toMatchObject({
        success: false,
        error: "LOCATION_NAME_ADDRESS_DUPLICATE",
      });
    },
    300_000,
  );
});
