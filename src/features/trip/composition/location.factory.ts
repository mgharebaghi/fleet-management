import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { ManageLocations } from "../application/location/manage-locations";
import { PrismaLocationRepository } from "../infrastructure/location/prisma-location-repository";

export function makeManageLocations() {
  return new ManageLocations(new PrismaLocationRepository(prisma));
}
