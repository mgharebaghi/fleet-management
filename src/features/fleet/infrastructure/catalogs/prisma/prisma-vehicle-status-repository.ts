import {
  Prisma,
  type PrismaClient,
  type VehicleStatus as PrismaVehicleStatus,
} from "../../../../../generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  type CatalogEntryChanges,
  type CatalogEntryWriter,
} from "../../../application/catalogs/ports/catalog-entry-writer";
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

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const vehicleStatus = await this.prismaClient.vehicleStatus.findFirst({
      where: {
        StatusName: name,
        ...(excludeId !== undefined
          ? { VehicleStatusId: { not: excludeId } }
          : {}),
      },
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

  // VehicleStatus has no IsActive column, so an update only ever renames it.
  async update(
    id: number,
    changes: CatalogEntryChanges,
  ): Promise<VehicleStatusEntry> {
    try {
      const updatedVehicleStatus = await this.prismaClient.vehicleStatus.update(
        {
          where: { VehicleStatusId: id },
          data: { StatusName: changes.name },
        },
      );

      return mapPrismaVehicleStatusToVehicleStatusEntry(updatedVehicleStatus);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        throw new CatalogEntryNotFoundError();
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.prismaClient.vehicleStatus.delete({
        where: { VehicleStatusId: id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          throw new CatalogEntryNotFoundError();
        }
        if (error.code === "P2003") {
          throw new CatalogEntryInUseError();
        }
      }
      throw error;
    }
  }
}
