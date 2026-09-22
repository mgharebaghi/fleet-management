import { randomUUID } from "node:crypto";
import { config } from "dotenv";

import { PrismaMssql } from "@prisma/adapter-mssql";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../../../../generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "../../../../infrastructure/database/prisma/mssql-config";
import { ManageLocations } from "../../application/location/manage-locations";
import { PrismaLocationRepository } from "./prisma-location-repository";

config({ path: ".env", quiet: true });
const development = {
  server: process.env.DATABASE_SERVER?.toLowerCase(),
  port: process.env.DATABASE_PORT?.trim() || "1433",
  name: process.env.DATABASE_NAME?.toLowerCase(),
};
config({ path: ".env.test.local", quiet: true });
const connection = createMssqlConfigFromEnvironment("TEST_DATABASE");
if (
  connection.database.toLowerCase() !== "fleetmanagementdb_integrationtest" ||
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
        latitude: "35.123456",
        longitude: "51.654321",
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

      const withoutCoordinates = await manage.create({
        locationName: `مکان بدون مختصات ${token}`,
        locationCode: null,
        locationType: null,
        address: null,
        latitude: null,
        longitude: null,
        description: null,
      });
      expect(withoutCoordinates.success).toBe(true);
      if (!withoutCoordinates.success) throw new Error(withoutCoordinates.error);
      locationIds.push(withoutCoordinates.location.locationId);
      expect(withoutCoordinates.location.latitude).toBeNull();
      expect(withoutCoordinates.location.longitude).toBeNull();

      const trimmed = await manage.create({
        locationName: `مکان مختصات کوتاه ${token}`,
        locationCode: null,
        locationType: null,
        address: null,
        latitude: "32.50",
        longitude: "-53.250000",
        description: null,
      });
      expect(trimmed.success).toBe(true);
      if (!trimmed.success) throw new Error(trimmed.error);
      locationIds.push(trimmed.location.locationId);
      expect(trimmed.location.latitude).toBe("32.5");
      expect(trimmed.location.longitude).toBe("-53.25");
      const [trimmedRow] = await client.$queryRaw<
        Array<{ latitudeOk: number; longitudeOk: number }>
      >`SELECT
          CASE WHEN Latitude = 32.5 THEN 1 ELSE 0 END latitudeOk,
          CASE WHEN Longitude = -53.25 THEN 1 ELSE 0 END longitudeOk
        FROM common.Location
        WHERE LocationId=${trimmed.location.locationId}`;
      expect(Number(trimmedRow?.latitudeOk)).toBe(1);
      expect(Number(trimmedRow?.longitudeOk)).toBe(1);
    },
    300_000,
  );
});
