import type { PrismaClient } from "@/generated/prisma/client";
import type { VehicleStatus as PrismaVehicleStatus } from "@/generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import type { CatalogEntryWriter } from "../../../application/catalogs/ports/catalog-entry-writer";
import type { VehicleStatusEntry } from "../../../application/catalogs/vehicle-status";

type VehicleStatusPrismaClient = Pick<PrismaClient, "vehicleStatus">;

function mapPrismaVehicleStatusToVehicleStatusEntry(
  prismaVehicleStatus: PrismaVehicleStatus,
): VehicleStatusEntry {
  return {
    id: prismaVehicleStatus.VehicleStatusId,
    name: prismaVehicleStatus.StatusName,
  };
}

export class PrismaVehicleStatusRepository
  implements
    CatalogEntryReader<VehicleStatusEntry>,
    CatalogEntryWriter<VehicleStatusEntry>
{
  constructor(private readonly prismaClient: VehicleStatusPrismaClient) {}

  async list(): Promise<VehicleStatusEntry[]> {
    const vehicleStatuses = await this.prismaClient.vehicleStatus.findMany({
      orderBy: { StatusName: "asc" },
    });

    return vehicleStatuses.map(mapPrismaVehicleStatusToVehicleStatusEntry);
  }

  async existsByName(name: string): Promise<boolean> {
    const vehicleStatus = await this.prismaClient.vehicleStatus.findFirst({
      where: { StatusName: name },
      select: { VehicleStatusId: true },
    });

    return vehicleStatus !== null;
  }

  async create(name: string): Promise<VehicleStatusEntry> {
    const createdVehicleStatus = await this.prismaClient.vehicleStatus.create({
      data: { StatusName: name },
    });

    return mapPrismaVehicleStatusToVehicleStatusEntry(createdVehicleStatus);
  }
}
