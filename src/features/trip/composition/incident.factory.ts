import { prisma } from "@/infrastructure/database/prisma/prisma-client";

import { ManageIncidents } from "../application/incident/manage-incidents";
import { PrismaIncidentRepository } from "../infrastructure/incident/prisma-incident-repository";

export function makeManageIncidents() {
  return new ManageIncidents(new PrismaIncidentRepository(prisma));
}
