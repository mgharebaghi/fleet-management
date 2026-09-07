import {
  Prisma,
  type PrismaClient,
  type VehicleBrand as PrismaVehicleBrand,
} from "../../../../../generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  type CatalogEntryChanges,
  type CatalogEntryWriter,
} from "../../../application/catalogs/ports/catalog-entry-writer";
import type { VehicleBrand } from "../../../application/catalogs/vehicle-brand";

type VehicleBrandPrismaClient = Pick<PrismaClient, "vehicleBrand">;

function mapPrismaVehicleBrandToVehicleBrand(
  prismaVehicleBrand: PrismaVehicleBrand,
): VehicleBrand {
  return {
    id: prismaVehicleBrand.BrandId,
    name: prismaVehicleBrand.BrandName,
    isActive: prismaVehicleBrand.IsActive,
  };
}

export class PrismaVehicleBrandRepository
  implements CatalogEntryReader<VehicleBrand>, CatalogEntryWriter<VehicleBrand>
{
  constructor(private readonly prismaClient: VehicleBrandPrismaClient) {}

  async list(): Promise<VehicleBrand[]> {
    const vehicleBrands = await this.prismaClient.vehicleBrand.findMany({
      orderBy: { BrandName: "asc" },
    });

    return vehicleBrands.map(mapPrismaVehicleBrandToVehicleBrand);
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const vehicleBrand = await this.prismaClient.vehicleBrand.findFirst({
      where: {
        BrandName: name,
        ...(excludeId !== undefined ? { BrandId: { not: excludeId } } : {}),
      },
      select: { BrandId: true },
    });

    return vehicleBrand !== null;
  }

  async create(name: string): Promise<VehicleBrand> {
    const createdVehicleBrand = await this.prismaClient.vehicleBrand.create({
      data: { BrandName: name },
    });

    return mapPrismaVehicleBrandToVehicleBrand(createdVehicleBrand);
  }

  async update(
    id: number,
    changes: CatalogEntryChanges,
  ): Promise<VehicleBrand> {
    try {
      const updatedVehicleBrand = await this.prismaClient.vehicleBrand.update(
        {
          where: { BrandId: id },
          data: {
            BrandName: changes.name,
            ...(changes.isActive !== undefined
              ? { IsActive: changes.isActive }
              : {}),
          },
        },
      );

      return mapPrismaVehicleBrandToVehicleBrand(updatedVehicleBrand);
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
      await this.prismaClient.vehicleBrand.delete({ where: { BrandId: id } });
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
