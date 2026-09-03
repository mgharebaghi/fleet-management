import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateCatalogEntry } from "../../application/catalogs/create-catalog-entry/create-catalog-entry";
import { ListCatalogEntries } from "../../application/catalogs/list-catalog-entries/list-catalog-entries";
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
