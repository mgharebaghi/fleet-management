import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageMaintenanceReferences } from "../application/reference-data/manage-maintenance-references";
import { PrismaMaintenanceReferenceRepository } from "../infrastructure/reference-data/prisma-maintenance-reference-repository";
export function makeMaintenanceReferences() { return new ManageMaintenanceReferences(new PrismaMaintenanceReferenceRepository(prisma)); }
