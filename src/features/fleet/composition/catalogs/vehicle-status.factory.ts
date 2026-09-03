import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateCatalogEntry } from "../../application/catalogs/create-catalog-entry/create-catalog-entry";
import { ListCatalogEntries } from "../../application/catalogs/list-catalog-entries/list-catalog-entries";
import { VEHICLE_STATUS_NAME_MAX_LENGTH } from "../../application/catalogs/vehicle-status";
import { PrismaVehicleStatusRepository } from "../../infrastructure/catalogs/prisma/prisma-vehicle-status-repository";

export function makeCreateVehicleStatus() {
  const vehicleStatusRepository = new PrismaVehicleStatusRepository(prisma);

  return new CreateCatalogEntry(
    vehicleStatusRepository,
    VEHICLE_STATUS_NAME_MAX_LENGTH,
  );
}

export function makeListVehicleStatuses() {
  const vehicleStatusRepository = new PrismaVehicleStatusRepository(prisma);

  return new ListCatalogEntries(vehicleStatusRepository);
}
