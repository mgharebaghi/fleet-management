import type { PrismaClient } from "@/generated/prisma/client";
import type { VehicleType as PrismaVehicleType } from "@/generated/prisma/client";

import type { CatalogEntryReader } from "../../../application/catalogs/ports/catalog-entry-reader";
import type { CatalogEntryWriter } from "../../../application/catalogs/ports/catalog-entry-writer";
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

  async existsByName(name: string): Promise<boolean> {
    const vehicleType = await this.prismaClient.vehicleType.findFirst({
      where: { TypeName: name },
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
}
