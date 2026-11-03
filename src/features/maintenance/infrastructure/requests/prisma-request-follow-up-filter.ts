import { Prisma } from "../../../../generated/prisma/client";

export function requestFollowUpFilter(status: string): Prisma.Sql {
  if (!status) return Prisma.empty;
  const exists = (condition: Prisma.Sql) => Prisma.sql`EXISTS (SELECT 1 FROM maintenance.WorkOrder o WHERE o.MaintenanceRequestId=r.MaintenanceRequestId AND ${condition})`;
  const state = (values: string[]) => exists(Prisma.sql`o.Status COLLATE Latin1_General_100_BIN2 IN (${Prisma.join(values)})`);
  const unknown = exists(Prisma.sql`o.Status COLLATE Latin1_General_100_BIN2 NOT IN (N'Open',N'InProgress',N'Completed',N'Cancelled')`);
  switch (status) {
    case "RepairUnknown": return Prisma.sql`AND ${unknown}`;
    case "RepairInProgress": return Prisma.sql`AND NOT ${unknown} AND ${state(["InProgress"])}`;
    case "RepairPending": return Prisma.sql`AND NOT ${unknown} AND NOT ${state(["InProgress"])} AND ${state(["Open"])}`;
    case "RepairCompleted": return Prisma.sql`AND NOT ${unknown} AND NOT ${state(["InProgress", "Open"])} AND ${state(["Completed"])}`;
    case "RepairCancelled": return Prisma.sql`AND NOT ${unknown} AND NOT ${state(["InProgress", "Open", "Completed"])} AND ${state(["Cancelled"])}`;
    default: return Prisma.sql`AND r.Status COLLATE Latin1_General_100_BIN2=${status} AND NOT ${exists(Prisma.sql`1=1`)}`;
  }
}
