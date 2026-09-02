import { PrismaMssql } from "@prisma/adapter-mssql";

import { PrismaClient } from "@/generated/prisma/client";
import { createMssqlConfigFromEnvironment } from "@/infrastructure/database/prisma/mssql-config";

const globalForPrisma = globalThis as typeof globalThis & {
  fleetManagementPrismaClient?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const mssqlConfig = createMssqlConfigFromEnvironment("DATABASE");

  return new PrismaClient({
    adapter: new PrismaMssql(mssqlConfig),
  });
}

export const prisma =
  globalForPrisma.fleetManagementPrismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.fleetManagementPrismaClient = prisma;
}
