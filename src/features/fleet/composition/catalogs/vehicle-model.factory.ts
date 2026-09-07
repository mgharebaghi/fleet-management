import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateVehicleModel } from "../../application/catalogs/create-vehicle-model/create-vehicle-model";
import { DeleteVehicleModel } from "../../application/catalogs/delete-vehicle-model/delete-vehicle-model";
import { ListVehicleModels } from "../../application/catalogs/list-vehicle-models/list-vehicle-models";
import { UpdateVehicleModel } from "../../application/catalogs/update-vehicle-model/update-vehicle-model";
import { PrismaVehicleModelRepository } from "../../infrastructure/catalogs/prisma/prisma-vehicle-model-repository";

export function makeCreateVehicleModel() {
  const vehicleModelRepository = new PrismaVehicleModelRepository(prisma);

  return new CreateVehicleModel(
    vehicleModelRepository,
    vehicleModelRepository,
  );
}

export function makeListVehicleModels() {
  const vehicleModelRepository = new PrismaVehicleModelRepository(prisma);

  return new ListVehicleModels(vehicleModelRepository);
}

export function makeUpdateVehicleModel() {
  const vehicleModelRepository = new PrismaVehicleModelRepository(prisma);

  return new UpdateVehicleModel(
    vehicleModelRepository,
    vehicleModelRepository,
  );
}

export function makeDeleteVehicleModel() {
  const vehicleModelRepository = new PrismaVehicleModelRepository(prisma);

  return new DeleteVehicleModel(vehicleModelRepository);
}
