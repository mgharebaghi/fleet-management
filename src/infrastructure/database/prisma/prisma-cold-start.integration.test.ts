import { PrismaMssql } from "@prisma/adapter-mssql";
import { expect, it } from "vitest";
import { PrismaClient } from "../../../generated/prisma/client";
import { loadTestDatabaseConfig } from "../../../test-support/database/test-database-config";
import { prismaTransactionOptions } from "./prisma-transaction-options";

it("reads the people list on the first transaction of fresh SQL Server pools", async () => {
  const config = loadTestDatabaseConfig("TEST_DATABASE");
  for (let attempt = 0; attempt < 3; attempt++) {
    const client = new PrismaClient({ adapter: new PrismaMssql(config), transactionOptions: prismaTransactionOptions });
    try {
      // No connect or warm-up query before this transaction: exercise startup.
      const [identity, people, count] = await client.$transaction([
        client.$queryRaw<Array<{ name: string }>>`SELECT DB_NAME() name`,
        client.people.findMany({ select: { PersonId: true }, take: 1 }),
        client.people.count(),
      ]);
      expect(identity[0].name).toBe(config.database);
      expect(people.length).toBeLessThanOrEqual(1);
      expect(count).toBeGreaterThanOrEqual(people.length);
    } finally { await client.$disconnect(); }
  }
}, 90000);
