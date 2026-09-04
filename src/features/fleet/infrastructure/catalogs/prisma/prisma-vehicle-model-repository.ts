import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import type { VehicleModelReader } from "../../../application/catalogs/ports/vehicle-model-reader";
import type { VehicleModelReferenceReader } from "../../../application/catalogs/ports/vehicle-model-reference-reader";
import type { VehicleModelWriter } from "../../../application/catalogs/ports/vehicle-model-writer";
import type {
  NewVehicleModel,
  VehicleModel,
} from "../../../application/catalogs/vehicle-model";

const vehicleModelSelect = {
  ModelId: true,
  ModelName: true,
  IsActive: true,
  VehicleBrand: {
    select: {
      BrandId: true,
      BrandName: true,
    },
  },
  VehicleType: {
    select: {
      VehicleTypeId: true,
      TypeName: true,
    },
  },
  FuelType: {
    select: {
      FuelTypeId: true,
      FuelTypeName: true,
    },
  },
} satisfies Prisma.VehicleModelSelect;

type SelectedPrismaVehicleModel = Prisma.VehicleModelGetPayload<{
  select: typeof vehicleModelSelect;
}>;

type VehicleModelPrismaClient = Pick<
  PrismaClient,
  "vehicleModel" | "vehicleBrand" | "vehicleType" | "fuelType"
>;

function mapPrismaVehicleModelToVehicleModel(
  prismaVehicleModel: SelectedPrismaVehicleModel,
): VehicleModel {
  return {
    id: prismaVehicleModel.ModelId,
    name: prismaVehicleModel.ModelName,
    isActive: prismaVehicleModel.IsActive,
    brand: {
      id: prismaVehicleModel.VehicleBrand.BrandId,
      name: prismaVehicleModel.VehicleBrand.BrandName,
    },
    vehicleType:
      prismaVehicleModel.VehicleType === null
        ? null
        : {
            id: prismaVehicleModel.VehicleType.VehicleTypeId,
            name: prismaVehicleModel.VehicleType.TypeName,
          },
    fuelType:
      prismaVehicleModel.FuelType === null
        ? null
        : {
            id: prismaVehicleModel.FuelType.FuelTypeId,
            name: prismaVehicleModel.FuelType.FuelTypeName,
          },
  };
}

export class PrismaVehicleModelRepository
  implements
    VehicleModelReader,
    VehicleModelWriter,
    VehicleModelReferenceReader
{
  constructor(private readonly prismaClient: VehicleModelPrismaClient) {}

  async list(): Promise<VehicleModel[]> {
    const vehicleModels = await this.prismaClient.vehicleModel.findMany({
      select: vehicleModelSelect,
      orderBy: { ModelId: "desc" },
    });

    return vehicleModels.map(mapPrismaVehicleModelToVehicleModel);
  }

  async create(input: NewVehicleModel): Promise<VehicleModel> {
    const vehicleModel = await this.prismaClient.vehicleModel.create({
      data: {
        ModelName: input.name,
        BrandId: input.brandId,
        VehicleTypeId: input.vehicleTypeId,
        FuelTypeId: input.fuelTypeId,
      },
      select: vehicleModelSelect,
    });

    return mapPrismaVehicleModelToVehicleModel(vehicleModel);
  }

  async brandExists(brandId: number): Promise<boolean> {
    const vehicleBrand = await this.prismaClient.vehicleBrand.findUnique({
      where: { BrandId: brandId },
      select: { BrandId: true },
    });

    return vehicleBrand !== null;
  }

  async vehicleTypeExists(vehicleTypeId: number): Promise<boolean> {
    const vehicleType = await this.prismaClient.vehicleType.findUnique({
      where: { VehicleTypeId: vehicleTypeId },
      select: { VehicleTypeId: true },
    });

    return vehicleType !== null;
  }

  async fuelTypeExists(fuelTypeId: number): Promise<boolean> {
    const fuelType = await this.prismaClient.fuelType.findUnique({
      where: { FuelTypeId: fuelTypeId },
      select: { FuelTypeId: true },
    });

    return fuelType !== null;
  }
}
