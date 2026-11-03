import type { Prisma } from "../../../generated/prisma/client";
export async function readRequestVehicleIds(client: Prisma.TransactionClient, requestId: number): Promise<number[]> {
  const rows = await client.tripExecution.findMany({ where: { Trip: { TripRequestId: requestId } }, select: { Status: true, VehicleDriverAssignment: { select: { VehicleId: true } } } });
  return [...new Set(rows.filter(row => row.Status !== "Cancelled").map(row => row.VehicleDriverAssignment.VehicleId))];
}
