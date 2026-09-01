import { PrismaMssql } from "@prisma/adapter-mssql";

import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  fleetManagementPrismaClient?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma Client.");
  }

  return new PrismaClient({
    adapter: new PrismaMssql(databaseUrl),
  });
}

export const prisma =
  globalForPrisma.fleetManagementPrismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.fleetManagementPrismaClient = prisma;
}
