import type { Prisma } from "../../../../generated/prisma/client";
import type { WorkOrderStartReadiness } from "../../application/work-orders/work-order-start-records";
export async function readWorkOrderStartReadiness(client: Prisma.TransactionClient, vehicleId: number, orderId: number): Promise<WorkOrderStartReadiness> {
  const [vehicle, orders, executions] = await Promise.all([
    client.vehicle.findUnique({ where: { VehicleId: vehicleId }, select: { IsActive: true } }),
    client.workOrder.findMany({ where: { VehicleId: vehicleId, WorkOrderId: { not: orderId } }, select: { Status: true } }),
    client.tripExecution.findMany({ where: { VehicleDriverAssignment: { VehicleId: vehicleId } }, select: { Status: true, ActualPickupDateTime: true, ActualDropoffDateTime: true, Trip: { select: { TripRequestId: true, TripRequest: { select: { Status: true } } } } } }),
  ]);
  let activeTrip = false, unknownState = orders.some(order => !["Open", "InProgress", "Completed", "Cancelled"].includes(order.Status));
  const planned = new Set<number>();
  for (const execution of executions) {
    if (!["Planned", "InProgress", "Completed", "Cancelled"].includes(execution.Status)) { unknownState = true; continue; }
    if (execution.Status === "InProgress" || (execution.ActualPickupDateTime !== null && execution.ActualDropoffDateTime === null)) activeTrip = true;
    if (execution.Status === "Planned") {
      const requestStatus = execution.Trip.TripRequest.Status;
      if (requestStatus === "InProgress") activeTrip = true;
      else if (requestStatus === "New" || requestStatus === "Assigned") planned.add(execution.Trip.TripRequestId);
      else unknownState = true;
    }
  }
  return { vehicleActive: vehicle?.IsActive === true, otherRepair: orders.some(order => order.Status === "InProgress"), activeTrip, plannedTrips: planned.size, unknownState };
}
