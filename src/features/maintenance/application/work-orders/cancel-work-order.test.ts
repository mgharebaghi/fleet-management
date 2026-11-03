import { beforeEach, expect, it, vi } from "vitest";
import { CancelWorkOrder } from "./cancel-work-order";
import type { WorkOrderRecord } from "./work-order-records";
import type { WorkOrderRepository, WorkOrderWriteSession } from "./work-order-repository";
const session = { order: vi.fn(), taskStates: vi.fn(), cancelOrder: vi.fn() };
const repository = { atomic: vi.fn() };
const cancel = new CancelWorkOrder(repository as Pick<WorkOrderRepository, "atomic">);
const order = { id: 3, status: "Open", origin: "Request", startedAt: null, finalDescription: null } as unknown as WorkOrderRecord;
beforeEach(() => {
  vi.resetAllMocks(); repository.atomic.mockImplementation((locks, work: (session: WorkOrderWriteSession) => unknown) => work(session as unknown as WorkOrderWriteSession));
  session.order.mockResolvedValue(order); session.taskStates.mockResolvedValue([{ id: 1, status: "Open" }, { id: 2, status: "Completed" }, { id: 3, status: "InProgress" }, { id: 4, status: "Cancelled" }]);
});
it("cancels an unstarted file with tasks under the shared parent lock and preserves completed history", async () => {
  expect(await cancel.execute(3, " ")).toEqual({ success: true });
  expect(repository.atomic).toHaveBeenCalledWith({ orderId: 3 }, expect.any(Function));
  expect(session.cancelOrder).toHaveBeenCalledWith(3, { reason: null, started: false, unfinishedTaskIds: [1, 3] });
});
it("requires a stopping result after repair starts, retaining a previous result", async () => {
  session.order.mockResolvedValue({ ...order, status: "InProgress", startedAt: "2026-11-01T10:00:00Z", finalDescription: "Existing result" });
  expect(await cancel.execute(3, " ")).toEqual({ success: false, error: "REASON_REQUIRED" });
  expect(session.cancelOrder).not.toHaveBeenCalled();
  expect(await cancel.execute(3, " Stopped ")).toEqual({ success: true });
  expect(session.cancelOrder).toHaveBeenCalledWith(3, { reason: "Existing result\nStopped", started: true, unfinishedTaskIds: [1, 3] });
});
it.each(["Completed", "Cancelled"])("does not reopen or cancel a %s file", async status => {
  session.order.mockResolvedValue({ ...order, status });
  expect(await cancel.execute(3, "Reason")).toEqual({ success: false, error: "ORDER_CLOSED" });
  expect(session.cancelOrder).not.toHaveBeenCalled();
});
it("rejects unknown parent or task states and inconsistent start information", async () => {
  for (const changes of [{ status: "External" }, { origin: "Unknown" }, { status: "InProgress", startedAt: null }]) {
    session.order.mockResolvedValue({ ...order, ...changes });
    expect(await cancel.execute(3, "Reason")).toEqual({ success: false, error: "UNKNOWN_STATE" });
  }
  session.order.mockResolvedValue(order); session.taskStates.mockResolvedValue([{ id: 1, status: "External" }]);
  expect(await cancel.execute(3, "Reason")).toEqual({ success: false, error: "UNKNOWN_STATE" });
  expect(session.cancelOrder).not.toHaveBeenCalled();
});
it("handles missing files, invalid IDs and exact database text limits without writing", async () => {
  expect(await cancel.execute(0, "Reason")).toEqual({ success: false, error: "INVALID_ID" });
  expect(await cancel.execute(3, "x".repeat(1001))).toEqual({ success: false, error: "REASON_TOO_LONG" });
  expect(repository.atomic).not.toHaveBeenCalled();
  session.order.mockResolvedValue(null);
  expect(await cancel.execute(3, "Reason")).toEqual({ success: false, error: "NOT_FOUND" });
  session.order.mockResolvedValue({ ...order, finalDescription: "x".repeat(1000) });
  expect(await cancel.execute(3, "Reason")).toEqual({ success: false, error: "REASON_TOO_LONG" });
  expect(session.cancelOrder).not.toHaveBeenCalled();
});
