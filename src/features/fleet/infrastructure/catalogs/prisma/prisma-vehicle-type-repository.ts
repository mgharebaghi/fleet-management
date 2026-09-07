import {
  Prisma,
  type PrismaClient,
  type VehicleType as PrismaVehicleType,
} from "../../../../../generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  type CatalogEntryChanges,
  type CatalogEntryWriter,
} from "../../../application/catalogs/ports/catalog-entry-writer";
import type { VehicleType } from "../../../application/catalogs/vehicle-type";

type VehicleTypePrismaClient = Pick<PrismaClient, "vehicleType">;

function mapPrismaVehicleTypeToVehicleType(
  prismaVehicleType: PrismaVehicleType,
): VehicleType {
  return {
    id: prismaVehicleType.VehicleTypeId,
    name: prismaVehicleType.TypeName,
    isActive: prismaVehicleType.IsActive,
  };
}

export class PrismaVehicleTypeRepository
  implements CatalogEntryReader<VehicleType>, CatalogEntryWriter<VehicleType>
{
  constructor(private readonly prismaClient: VehicleTypePrismaClient) {}

  async list(): Promise<VehicleType[]> {
    const vehicleTypes = await this.prismaClient.vehicleType.findMany({
      orderBy: { TypeName: "asc" },
    });

    return vehicleTypes.map(mapPrismaVehicleTypeToVehicleType);
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const vehicleType = await this.prismaClient.vehicleType.findFirst({
      where: {
        TypeName: name,
        ...(excludeId !== undefined
          ? { VehicleTypeId: { not: excludeId } }
          : {}),
      },
      select: { VehicleTypeId: true },
    });

    return vehicleType !== null;
  }

  async create(name: string): Promise<VehicleType> {
    const createdVehicleType = await this.prismaClient.vehicleType.create({
      data: { TypeName: name },
    });

    return mapPrismaVehicleTypeToVehicleType(createdVehicleType);
  }

  async update(id: number, changes: CatalogEntryChanges): Promise<VehicleType> {
    try {
      const updatedVehicleType = await this.prismaClient.vehicleType.update({
        where: { VehicleTypeId: id },
        data: {
          TypeName: changes.name,
          ...(changes.isActive !== undefined
            ? { IsActive: changes.isActive }
            : {}),
        },
      });

      return mapPrismaVehicleTypeToVehicleType(updatedVehicleType);
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
      await this.prismaClient.vehicleType.delete({
        where: { VehicleTypeId: id },
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
