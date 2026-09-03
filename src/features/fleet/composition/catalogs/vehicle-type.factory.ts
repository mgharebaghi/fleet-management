import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateCatalogEntry } from "../../application/catalogs/create-catalog-entry/create-catalog-entry";
import { ListCatalogEntries } from "../../application/catalogs/list-catalog-entries/list-catalog-entries";
import { VEHICLE_TYPE_NAME_MAX_LENGTH } from "../../application/catalogs/vehicle-type";
import { PrismaVehicleTypeRepository } from "../../infrastructure/catalogs/prisma/prisma-vehicle-type-repository";

export function makeCreateVehicleType() {
  const vehicleTypeRepository = new PrismaVehicleTypeRepository(prisma);

  return new CreateCatalogEntry(
    vehicleTypeRepository,
    VEHICLE_TYPE_NAME_MAX_LENGTH,
  );
}

export function makeListVehicleTypes() {
  const vehicleTypeRepository = new PrismaVehicleTypeRepository(prisma);

  return new ListCatalogEntries(vehicleTypeRepository);
}
