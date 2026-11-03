import { beforeEach, expect, it, vi } from "vitest";
import { StartWorkOrder } from "./start-work-order";
import type { WorkOrderRecord } from "./work-order-records";
import type { WorkOrderRepository, WorkOrderWriteSession } from "./work-order-repository";
const order = { id: 3, status: "Open", origin: "Direct", vehicle: { id: 1 }, workLocation: "OnSite", workshopId: null, startedAt: null, endedAt: null } as unknown as WorkOrderRecord;
const ready = { vehicleActive: true, otherRepair: false, activeTrip: false, plannedTrips: 0, unknownState: false };
const session = { order: vi.fn(), startReadiness: vi.fn(), startOrder: vi.fn() };
const repository = { get: vi.fn(), atomic: vi.fn() };
const start = new StartWorkOrder(repository as Pick<WorkOrderRepository, "get" | "atomic">);
beforeEach(() => { vi.resetAllMocks(); repository.get.mockResolvedValue(order); repository.atomic.mockImplementation((locks, work: (session: WorkOrderWriteSession) => unknown) => work(session as unknown as WorkOrderWriteSession)); session.order.mockResolvedValue(order); session.startReadiness.mockResolvedValue(ready); });
it("starts an open file under its physical vehicle and parent locks without requiring costs or tasks", async () => {
  expect(await start.execute(3, false)).toEqual({ success: true, id: 3 });
  expect(repository.atomic).toHaveBeenCalledWith({ vehicleId: 1, orderId: 3 }, expect.any(Function));
  expect(session.startOrder).toHaveBeenCalledWith(3);
});
it.each([[{ otherRepair: true }, "ANOTHER_REPAIR"], [{ activeTrip: true }, "ACTIVE_TRIP"], [{ vehicleActive: false }, "VEHICLE_INACTIVE"], [{ unknownState: true }, "UNKNOWN_STATE"]])("does not start an unavailable vehicle: %j", async (changes, error) => {
  session.startReadiness.mockResolvedValue({ ...ready, ...changes }); expect(await start.execute(3, true)).toEqual({ success: false, error }); expect(session.startOrder).not.toHaveBeenCalled();
});
it("requires explicit acknowledgement for planned trips and always rechecks current active trips", async () => {
  session.startReadiness.mockResolvedValue({ ...ready, plannedTrips: 2 });
  expect(await start.execute(3, false)).toEqual({ success: false, error: "PLANNED_TRIPS_REQUIRE_CONFIRMATION", plannedTrips: 2 }); expect(session.startOrder).not.toHaveBeenCalled();
  expect(await start.execute(3, true)).toEqual({ success: true, id: 3 });
  session.startReadiness.mockResolvedValue({ ...ready, activeTrip: true, plannedTrips: 2 });
  expect(await start.execute(3, true)).toEqual({ success: false, error: "ACTIVE_TRIP" });
});
it.each([["InProgress", "ALREADY_STARTED"], ["Completed", "ORDER_CLOSED"], ["Cancelled", "ORDER_CLOSED"], ["External", "UNKNOWN_STATE"]])("rejects repeat/closed/unknown status %s", async (status, error) => {
  session.order.mockResolvedValue({ ...order, status }); expect(await start.execute(3, false)).toEqual({ success: false, error }); expect(session.startOrder).not.toHaveBeenCalled();
});
it("rechecks the vehicle identity and stored start/location metadata under the lock", async () => {
  for (const changes of [{ vehicle: { id: 2 } }, { startedAt: "2026-11-01T10:00:00Z" }, { endedAt: "2026-11-01T10:00:00Z" }, { workLocation: "External" }, { workLocation: "Workshop", workshopId: null }, { origin: "Unknown" }]) {
    session.order.mockResolvedValue({ ...order, ...changes }); expect(await start.execute(3, false)).toEqual({ success: false, error: "UNKNOWN_STATE" });
  }
  expect(session.startReadiness).not.toHaveBeenCalled(); expect(session.startOrder).not.toHaveBeenCalled();
});
it("fails invalid or missing identifiers without acquiring unrelated locks", async () => {
  expect(await start.execute(0, false)).toEqual({ success: false, error: "INVALID_ID" }); expect(repository.get).not.toHaveBeenCalled();
  repository.get.mockResolvedValue(null); expect(await start.execute(3, false)).toEqual({ success: false, error: "NOT_FOUND" }); expect(repository.atomic).not.toHaveBeenCalled();
});
