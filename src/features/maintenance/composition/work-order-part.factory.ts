import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageWorkOrderParts } from "../application/work-order-parts/manage-work-order-parts";
import { PrismaWorkOrderPartRepository } from "../infrastructure/work-order-parts/prisma-work-order-part-repository";
export function makeWorkOrderParts() { return new ManageWorkOrderParts(new PrismaWorkOrderPartRepository(prisma)); }
