import type { PrismaClient } from "@/generated/prisma/client";
import type { FuelType as PrismaFuelType } from "@/generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import type { CatalogEntryWriter } from "../../../application/catalogs/ports/catalog-entry-writer";
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

  async existsByName(name: string): Promise<boolean> {
    const fuelType = await this.prismaClient.fuelType.findFirst({
      where: { FuelTypeName: name },
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
}
