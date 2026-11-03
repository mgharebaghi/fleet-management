import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageMaintenanceRequests } from "../application/requests/manage-maintenance-requests";
import { PrismaMaintenanceRequestRepository } from "../infrastructure/requests/prisma-maintenance-request-repository";
export function makeMaintenanceRequests() { return new ManageMaintenanceRequests(new PrismaMaintenanceRequestRepository(prisma)); }
