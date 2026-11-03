import { beforeEach, expect, it, vi } from "vitest";
import { CompleteWorkOrder } from "./complete-work-order";
import type { WorkOrderRecord } from "./work-order-records";
import type { WorkOrderRepository, WorkOrderWriteSession } from "./work-order-repository";
const session = { order: vi.fn(), taskStates: vi.fn(), completionContext: vi.fn(), completeOrder: vi.fn() };
const repository = { get: vi.fn(), atomic: vi.fn(), readings: vi.fn() };
const useCase = new CompleteWorkOrder(repository as Pick<WorkOrderRepository, "get" | "atomic"> & { readings: typeof repository.readings });
const order = { id: 3, vehicle: { id: 7 }, type: { id: 2 }, planId: null, origin: "Request", status: "InProgress", startedAt: "2026-11-03T08:00:00+03:30", endedAt: null } as unknown as WorkOrderRecord;
const context = { now: "2026-11-03T10:00:00+03:30", plan: null, readings: [] };
const input = { id: 3, result: " Repair done ", readingId: null };
beforeEach(() => {
  vi.resetAllMocks(); repository.get.mockResolvedValue(order); repository.atomic.mockImplementation((locks, work: (session: WorkOrderWriteSession) => unknown) => work(session as unknown as WorkOrderWriteSession));
  session.order.mockResolvedValue(order); session.taskStates.mockResolvedValue([{ id: 1, status: "Completed" }, { id: 2, status: "Cancelled" }]); session.completionContext.mockResolvedValue(context);
});
it("completes under vehicle/order locks using server time without requiring prices or writing vehicle meters", async () => {
  expect(await useCase.execute(input)).toEqual({ success: true, id: 3 });
  expect(repository.atomic).toHaveBeenCalledWith({ vehicleId: 7, orderId: 3 }, expect.any(Function));
  expect(session.completeOrder).toHaveBeenCalledWith(3, { result: "Repair done", endedAt: context.now, planBaseline: null });
});
it.each([[{ id: 0 }, "INVALID_ID"], [{ result: " " }, "RESULT_REQUIRED"], [{ result: "x".repeat(1001) }, "RESULT_TOO_LONG"], [{ readingId: -1 }, "INVALID_READING"]])("rejects malformed input %s", async (value, error) => {
  expect(await useCase.execute({ ...input, ...value })).toEqual({ success: false, error }); expect(repository.atomic).not.toHaveBeenCalled();
});
it.each([["Open", "ORDER_NOT_STARTED"], ["Completed", "ORDER_CLOSED"], ["Cancelled", "ORDER_CLOSED"], ["External", "UNKNOWN_STATE"]])("rejects parent %s", async (status, error) => {
  session.order.mockResolvedValue({ ...order, status }); expect(await useCase.execute(input)).toEqual({ success: false, error }); expect(session.completeOrder).not.toHaveBeenCalled();
});
it.each([[[], "NO_COMPLETED_TASK"], [["Cancelled"], "NO_COMPLETED_TASK"], [["Open", "Completed"], "UNFINISHED_TASKS"], [["InProgress"], "UNFINISHED_TASKS"], [["External"], "UNKNOWN_STATE"]])("checks task resolution %s", async (statuses, error) => {
  session.taskStates.mockResolvedValue((statuses as string[]).map(status => ({ status }))); expect(await useCase.execute(input)).toEqual({ success: false, error }); expect(session.completeOrder).not.toHaveBeenCalled();
});
it("rejects missing, changed, inconsistent and future-start files", async () => {
  repository.get.mockResolvedValue(null); expect(await useCase.execute(input)).toEqual({ success: false, error: "NOT_FOUND" });
  repository.get.mockResolvedValue(order); session.order.mockResolvedValue({ ...order, vehicle: { id: 8 } }); expect(await useCase.execute(input)).toEqual({ success: false, error: "UNKNOWN_STATE" });
  session.order.mockResolvedValue({ ...order, startedAt: null }); expect(await useCase.execute(input)).toEqual({ success: false, error: "UNKNOWN_STATE" });
  session.order.mockResolvedValue({ ...order, startedAt: "2026-11-04T10:00:00+03:30" }); expect(await useCase.execute(input)).toEqual({ success: false, error: "INVALID_END_TIME" });
});
const reading = { id: 10, recordedAt: "2026-11-03T09:00:00+03:30", odometer: "200.01", engineHours: "25.10" };
const plan = { id: 5, vehicleId: 7, typeId: 2, needsOdometer: true, needsEngineHours: true, lastDate: "2026-11-01", lastOdometer: "100.01", lastEngineHours: "20.00" };
function service() { repository.get.mockResolvedValue({ ...order, origin: "Plan", planId: 5 }); session.order.mockResolvedValue({ ...order, origin: "Plan", planId: 5 }); session.completionContext.mockResolvedValue({ ...context, plan, readings: [reading] }); }
it("advances only the same service plan atomically with exact historical readings", async () => {
  service(); expect(await useCase.execute({ ...input, readingId: 10 })).toEqual({ success: true, id: 3 });
  expect(repository.atomic).toHaveBeenCalledWith({ vehicleId: 7, orderId: 3, planId: 5 }, expect.any(Function));
  expect(session.completeOrder).toHaveBeenCalledWith(3, { result: "Repair done", endedAt: context.now, planBaseline: { id: 5, odometer: "200.01", engineHours: "25.10" } });
});
it("requires relevant service readings and preserves newer baselines", async () => {
  service(); expect(await useCase.execute(input)).toEqual({ success: false, error: "PLAN_READING_REQUIRED" });
  expect(await useCase.execute({ ...input, readingId: 99 })).toEqual({ success: false, error: "INVALID_READING" });
  session.completionContext.mockResolvedValue({ ...context, plan: { ...plan, lastOdometer: "300" }, readings: [reading] }); expect(await useCase.execute({ ...input, readingId: 10 })).toEqual({ success: false, error: "PLAN_BASELINE_NEWER" });
  session.completionContext.mockResolvedValue({ ...context, plan: { ...plan, lastDate: "2026-11-04" }, readings: [reading] }); expect(await useCase.execute({ ...input, readingId: 10 })).toEqual({ success: false, error: "PLAN_BASELINE_NEWER" });
  expect(session.completeOrder).not.toHaveBeenCalled();
});
it("rejects a regressing meter history, future readings and mismatched plans", async () => {
  service(); session.completionContext.mockResolvedValue({ ...context, plan, readings: [{ ...reading, id: 9, recordedAt: "2026-11-03T08:00:00+03:30", odometer: "300" }, reading] });
  expect(await useCase.execute({ ...input, readingId: 10 })).toEqual({ success: false, error: "INVALID_READING" });
  session.completionContext.mockResolvedValue({ ...context, plan, readings: [{ ...reading, recordedAt: "2026-11-04T09:00:00+03:30" }] }); expect(await useCase.execute({ ...input, readingId: 10 })).toEqual({ success: false, error: "INVALID_READING" });
  session.completionContext.mockResolvedValue({ ...context, plan: { ...plan, vehicleId: 8 }, readings: [reading] }); expect(await useCase.execute({ ...input, readingId: 10 })).toEqual({ success: false, error: "UNKNOWN_STATE" });
});
it("allows date-only service without inventing odometer or engine-hour values", async () => {
  service(); session.completionContext.mockResolvedValue({ ...context, plan: { ...plan, needsOdometer: false, needsEngineHours: false }, readings: [] });
  expect((await useCase.execute(input)).success).toBe(true); expect(session.completeOrder).toHaveBeenCalledWith(3, expect.objectContaining({ planBaseline: { id: 5, odometer: null, engineHours: null } }));
});

it("compares service dates using Tehran calendar day even when persistence returns UTC", async () => {
  service(); session.completionContext.mockResolvedValue({ ...context, now: "2026-11-03T21:00:00Z", plan: { ...plan, lastDate: "2026-11-04" }, readings: [reading] });
  expect((await useCase.execute({ ...input, readingId: 10 })).success).toBe(true);
});
