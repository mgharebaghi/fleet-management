import {
  Prisma,
  type PrismaClient,
} from "../../../../generated/prisma/client";
import {
  normalizeLocationCode,
  normalizeLocationText,
} from "../../application/location/manage-locations";
import type {
  LocationRepository,
  LocationWriteSession,
} from "../../application/location/location-repository";
import type { CreateLocationCommand } from "../../application/location/location-records";

type Client = Prisma.TransactionClient;

class PrismaLocationWriteSession implements LocationWriteSession {
  constructor(private readonly client: Client) {}

  async duplicateCandidates() {
    const rows = await this.client.location.findMany({
      select: {
        LocationId: true,
        LocationCode: true,
        LocationName: true,
        LocationType: true,
        Address: true,
        IsActive: true,
      },
      orderBy: { LocationId: "asc" },
    });
    return rows.map((row) => ({
      locationId: row.LocationId,
      locationCode: row.LocationCode,
      locationName: row.LocationName,
      locationType: row.LocationType,
      address: row.Address,
      isActive: row.IsActive,
      normalizedCode: normalizeLocationCode(row.LocationCode),
      normalizedName: normalizeLocationText(row.LocationName),
      normalizedAddress:
        row.Address === null ? null : normalizeLocationText(row.Address) || null,
    }));
  }

  async create(input: CreateLocationCommand) {
    const row = await this.client.location.create({
      data: {
        LocationName: input.locationName,
        LocationCode: input.locationCode,
        LocationType: input.locationType,
        Address: input.address,
        Latitude:
          input.latitude === null ? null : new Prisma.Decimal(input.latitude),
        Longitude:
          input.longitude === null ? null : new Prisma.Decimal(input.longitude),
        Description: input.description,
        IsActive: true,
      },
      select: {
        LocationId: true,
        LocationCode: true,
        LocationName: true,
        LocationType: true,
        Address: true,
        IsActive: true,
      },
    });
    return {
      locationId: row.LocationId,
      locationCode: row.LocationCode,
      locationName: row.LocationName,
      locationType: row.LocationType,
      address: row.Address,
      isActive: row.IsActive,
    };
  }
}

export class PrismaLocationRepository implements LocationRepository {
  constructor(private readonly client: PrismaClient) {}

  async atomic<T>(work: (session: LocationWriteSession) => Promise<T>) {
    return this.client.$transaction(
      (transaction) => work(new PrismaLocationWriteSession(transaction)),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 15_000,
        timeout: 30_000,
      },
    );
  }
}
