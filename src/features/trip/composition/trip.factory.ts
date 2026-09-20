import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { ManageTrips } from "../application/manage-trips";
import { ReadTrips } from "../application/read-trips";
import { PrismaTripRepository } from "../infrastructure/prisma-trip-repository";

export function makeManageTrips() {
  return new ManageTrips(new PrismaTripRepository(prisma));
}

export function makeReadTrips() {
  return new ReadTrips(new PrismaTripRepository(prisma));
}
