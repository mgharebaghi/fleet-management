import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateVehicleModel } from "../../application/catalogs/create-vehicle-model/create-vehicle-model";
import { ListVehicleModels } from "../../application/catalogs/list-vehicle-models/list-vehicle-models";
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
