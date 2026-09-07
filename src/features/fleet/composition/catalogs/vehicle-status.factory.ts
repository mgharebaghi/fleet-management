import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateCatalogEntry } from "../../application/catalogs/create-catalog-entry/create-catalog-entry";
import { DeleteCatalogEntry } from "../../application/catalogs/delete-catalog-entry/delete-catalog-entry";
import { ListCatalogEntries } from "../../application/catalogs/list-catalog-entries/list-catalog-entries";
import { UpdateCatalogEntry } from "../../application/catalogs/update-catalog-entry/update-catalog-entry";
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

export function makeUpdateVehicleStatus() {
  const vehicleStatusRepository = new PrismaVehicleStatusRepository(prisma);

  return new UpdateCatalogEntry(
    vehicleStatusRepository,
    VEHICLE_STATUS_NAME_MAX_LENGTH,
  );
}

export function makeDeleteVehicleStatus() {
  const vehicleStatusRepository = new PrismaVehicleStatusRepository(prisma);

  return new DeleteCatalogEntry(vehicleStatusRepository);
}
