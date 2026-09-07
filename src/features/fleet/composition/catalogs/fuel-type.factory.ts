import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateCatalogEntry } from "../../application/catalogs/create-catalog-entry/create-catalog-entry";
import { DeleteCatalogEntry } from "../../application/catalogs/delete-catalog-entry/delete-catalog-entry";
import { ListCatalogEntries } from "../../application/catalogs/list-catalog-entries/list-catalog-entries";
import { UpdateCatalogEntry } from "../../application/catalogs/update-catalog-entry/update-catalog-entry";
import { FUEL_TYPE_NAME_MAX_LENGTH } from "../../application/catalogs/fuel-type";
import { PrismaFuelTypeRepository } from "../../infrastructure/catalogs/prisma/prisma-fuel-type-repository";

export function makeCreateFuelType() {
  const fuelTypeRepository = new PrismaFuelTypeRepository(prisma);

  return new CreateCatalogEntry(fuelTypeRepository, FUEL_TYPE_NAME_MAX_LENGTH);
}

export function makeListFuelTypes() {
  const fuelTypeRepository = new PrismaFuelTypeRepository(prisma);

  return new ListCatalogEntries(fuelTypeRepository);
}

export function makeUpdateFuelType() {
  const fuelTypeRepository = new PrismaFuelTypeRepository(prisma);

  return new UpdateCatalogEntry(fuelTypeRepository, FUEL_TYPE_NAME_MAX_LENGTH);
}

export function makeDeleteFuelType() {
  const fuelTypeRepository = new PrismaFuelTypeRepository(prisma);

  return new DeleteCatalogEntry(fuelTypeRepository);
}
