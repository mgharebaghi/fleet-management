import type { PrismaClient } from "../../../generated/prisma/client";
import { NON_TERMINAL_TRIP_EXECUTION_STATUSES } from "../application/trip-lifecycle";
import type { TripPrismaClient } from "./prisma-trip-mapping";

type OccupancyClient = PrismaClient | TripPrismaClient;

/**
 * Prisma groupBy cannot group by the related VehicleId, so assignment
 * counts are folded onto the physical vehicle here. Status filtering uses
 * the shared non-terminal execution statuses.
 */
export async function readActivePassengerCountsByVehicle(
  client: OccupancyClient,
  vehicleIds: readonly number[],
): Promise<Record<number, number>> {
  const ids = [...new Set(vehicleIds)];
  if (ids.length === 0) return {};

  const grouped = await client.tripExecution.groupBy({
    by: ["VehicleDriverAssignmentId"],
    where: {
      Status: { in: [...NON_TERMINAL_TRIP_EXECUTION_STATUSES] },
      VehicleDriverAssignment: { VehicleId: { in: ids } },
    },
    _count: { TripExecutionId: true },
  });
  if (grouped.length === 0) return {};

  const assignments = await client.vehicleDriverAssignment.findMany({
    where: {
      AssignmentId: {
        in: grouped.map((row) => row.VehicleDriverAssignmentId),
      },
    },
    select: { AssignmentId: true, VehicleId: true },
  });
  const vehicleByAssignment = new Map(
    assignments.map((row) => [row.AssignmentId, row.VehicleId]),
  );
  const counts: Record<number, number> = {};
  for (const row of grouped) {
    const vehicleId = vehicleByAssignment.get(row.VehicleDriverAssignmentId);
    if (vehicleId === undefined) continue;
    counts[vehicleId] =
      (counts[vehicleId] ?? 0) + row._count.TripExecutionId;
  }
  return counts;
}
