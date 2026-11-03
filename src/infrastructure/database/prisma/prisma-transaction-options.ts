// SQL Server connection acquisition and transaction startup can exceed Prisma's
// 2-second default on a cold pool. Keep the wait bounded without retrying writes
// or extending the timeout for work inside the transaction.
export const prismaTransactionOptions = { maxWait: 15_000 } as const;
