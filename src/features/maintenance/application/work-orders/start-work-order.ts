import { workOrderStatuses } from "./work-order-records";
import type { WorkOrderRepository } from "./work-order-repository";
import type { WorkOrderStartResult } from "./work-order-start-records";
export class StartWorkOrder {
  constructor(private readonly repository: Pick<WorkOrderRepository, "get" | "atomic">) {}
  async execute(id: number, acknowledgePlannedTrips: boolean): Promise<WorkOrderStartResult> {
    if (!Number.isInteger(id) || id <= 0 || id > 2147483647) return { success: false, error: "INVALID_ID" };
    const previous = await this.repository.get(id);
    if (!previous) return { success: false, error: "NOT_FOUND" };
    return this.repository.atomic({ vehicleId: previous.vehicle.id, orderId: id }, async session => {
      const order = await session.order(id);
      if (!order) return { success: false, error: "NOT_FOUND" };
      if (order.vehicle.id !== previous.vehicle.id || order.origin === "Unknown" || !workOrderStatuses.some(status => status === order.status)) return { success: false, error: "UNKNOWN_STATE" };
      if (order.status === "Completed" || order.status === "Cancelled") return { success: false, error: "ORDER_CLOSED" };
      if (order.status === "InProgress") return { success: false, error: "ALREADY_STARTED" };
      if (order.startedAt !== null || order.endedAt !== null || !["OnSite", "Workshop"].includes(order.workLocation) || (order.workLocation === "Workshop" && order.workshopId === null)) return { success: false, error: "UNKNOWN_STATE" };
      const readiness = await session.startReadiness(order.vehicle.id, id);
      if (!readiness.vehicleActive) return { success: false, error: "VEHICLE_INACTIVE" };
      if (readiness.unknownState) return { success: false, error: "UNKNOWN_STATE" };
      if (readiness.otherRepair) return { success: false, error: "ANOTHER_REPAIR" };
      if (readiness.activeTrip) return { success: false, error: "ACTIVE_TRIP" };
      if (readiness.plannedTrips > 0 && !acknowledgePlannedTrips) return { success: false, error: "PLANNED_TRIPS_REQUIRE_CONFIRMATION", plannedTrips: readiness.plannedTrips };
      await session.startOrder(id);
      return { success: true, id };
    });
  }
}
