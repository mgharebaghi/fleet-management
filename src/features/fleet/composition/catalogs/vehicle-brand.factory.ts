import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { CreateCatalogEntry } from "../../application/catalogs/create-catalog-entry/create-catalog-entry";
import { ListCatalogEntries } from "../../application/catalogs/list-catalog-entries/list-catalog-entries";
import { VEHICLE_BRAND_NAME_MAX_LENGTH } from "../../application/catalogs/vehicle-brand";
import { PrismaVehicleBrandRepository } from "../../infrastructure/catalogs/prisma/prisma-vehicle-brand-repository";

export function makeCreateVehicleBrand() {
  const vehicleBrandRepository = new PrismaVehicleBrandRepository(prisma);

  return new CreateCatalogEntry(
    vehicleBrandRepository,
    VEHICLE_BRAND_NAME_MAX_LENGTH,
  );
}

export function makeListVehicleBrands() {
  const vehicleBrandRepository = new PrismaVehicleBrandRepository(prisma);

  return new ListCatalogEntries(vehicleBrandRepository);
}
