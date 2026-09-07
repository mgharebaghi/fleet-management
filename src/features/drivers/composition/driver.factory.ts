import { prisma } from "@/infrastructure/database/prisma/prisma-client";
import { PrismaDriverRepository } from "../infrastructure/prisma-driver-repository";
import { ManageDrivers } from "../application/manage-drivers";
import { ReadDrivers } from "../application/read-drivers";

export function makeManageDrivers() { return new ManageDrivers(new PrismaDriverRepository(prisma)); }
export function makeReadDrivers() { return new ReadDrivers(new PrismaDriverRepository(prisma)); }
