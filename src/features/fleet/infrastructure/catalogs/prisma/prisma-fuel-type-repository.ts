import {
  Prisma,
  type PrismaClient,
  type FuelType as PrismaFuelType,
} from "../../../../../generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  type CatalogEntryChanges,
  type CatalogEntryWriter,
} from "../../../application/catalogs/ports/catalog-entry-writer";
import type { FuelType } from "../../../application/catalogs/fuel-type";

type FuelTypePrismaClient = Pick<PrismaClient, "fuelType">;

function mapPrismaFuelTypeToFuelType(prismaFuelType: PrismaFuelType): FuelType {
  return {
    id: prismaFuelType.FuelTypeId,
    name: prismaFuelType.FuelTypeName,
    isActive: prismaFuelType.IsActive,
  };
}

export class PrismaFuelTypeRepository
  implements CatalogEntryReader<FuelType>, CatalogEntryWriter<FuelType>
{
  constructor(private readonly prismaClient: FuelTypePrismaClient) {}

  async list(): Promise<FuelType[]> {
    const fuelTypes = await this.prismaClient.fuelType.findMany({
      orderBy: { FuelTypeName: "asc" },
    });

    return fuelTypes.map(mapPrismaFuelTypeToFuelType);
  }

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const fuelType = await this.prismaClient.fuelType.findFirst({
      where: {
        FuelTypeName: name,
        ...(excludeId !== undefined ? { FuelTypeId: { not: excludeId } } : {}),
      },
      select: { FuelTypeId: true },
    });

    return fuelType !== null;
  }

  async create(name: string): Promise<FuelType> {
    const createdFuelType = await this.prismaClient.fuelType.create({
      data: { FuelTypeName: name },
    });

    return mapPrismaFuelTypeToFuelType(createdFuelType);
  }

  async update(id: number, changes: CatalogEntryChanges): Promise<FuelType> {
    try {
      const updatedFuelType = await this.prismaClient.fuelType.update({
        where: { FuelTypeId: id },
        data: {
          FuelTypeName: changes.name,
          ...(changes.isActive !== undefined
            ? { IsActive: changes.isActive }
            : {}),
        },
      });

      return mapPrismaFuelTypeToFuelType(updatedFuelType);
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
      await this.prismaClient.fuelType.delete({
        where: { FuelTypeId: id },
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
