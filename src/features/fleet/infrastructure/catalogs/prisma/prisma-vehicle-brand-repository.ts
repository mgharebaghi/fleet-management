import type { PrismaClient } from "@/generated/prisma/client";
import type { VehicleBrand as PrismaVehicleBrand } from "@/generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import type { CatalogEntryWriter } from "../../../application/catalogs/ports/catalog-entry-writer";
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

  async existsByName(name: string): Promise<boolean> {
    const vehicleBrand = await this.prismaClient.vehicleBrand.findFirst({
      where: { BrandName: name },
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
}
