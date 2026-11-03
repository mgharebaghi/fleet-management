import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageParts } from "../application/parts/manage-parts";
import { PrismaPartRepository } from "../infrastructure/parts/prisma-part-repository";
export function makeManageParts() { return new ManageParts(new PrismaPartRepository(prisma)); }
