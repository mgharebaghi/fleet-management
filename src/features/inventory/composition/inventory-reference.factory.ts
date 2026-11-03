import { prisma } from "../../../infrastructure/database/prisma/prisma-client";
import { ManageInventoryReferences } from "../application/reference-data/manage-inventory-references";
import { ReadInventoryReferences } from "../application/reference-data/read-inventory-references";
import { PrismaInventoryReferenceRepository } from "../infrastructure/reference-data/prisma-inventory-reference-repository";

export function makeReadInventoryReferences() { return new ReadInventoryReferences(new PrismaInventoryReferenceRepository(prisma)); }
export function makeManageInventoryReferences() { return new ManageInventoryReferences(new PrismaInventoryReferenceRepository(prisma)); }
