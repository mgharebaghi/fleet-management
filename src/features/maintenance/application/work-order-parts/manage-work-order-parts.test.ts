import { beforeEach, expect, it, vi } from "vitest";
import { ManageWorkOrderParts } from "./manage-work-order-parts";
import { workPartCosts } from "./work-part-costs";
import type { WorkOrderRecord } from "../work-orders/work-order-records";
import type { SaveWorkOrderPart, WorkOrderPart } from "./work-order-part-records";
import type { WorkOrderPartRepository, WorkOrderPartSession } from "./work-order-part-repository";
const order = { id: 1, status: "Open", origin: "Direct" } as WorkOrderRecord;
const part = { id: 2, code: "P2", name: "Part", unitName: "Unit", isActive: true };
const input: SaveWorkOrderPart = { id: null, partId: 2, taskId: null, quantity: "1.01", unitPrice: null, description: null };
const item: WorkOrderPart = { ...input, id: 3, orderId: 1, part, totalPrice: null, createdAt: "2026-11-03T10:00:00Z" };
const session = { order: vi.fn(), item: vi.fn(), task: vi.fn(), catalog: { part: vi.fn(), options: vi.fn() }, save: vi.fn(), delete: vi.fn(), fillPrice: vi.fn() } satisfies WorkOrderPartSession;
const repository = { atomic: vi.fn(), snapshot: vi.fn() } satisfies WorkOrderPartRepository;
const manage = new ManageWorkOrderParts(repository);
beforeEach(() => { vi.resetAllMocks(); repository.atomic.mockImplementation((id, work) => work(session)); session.order.mockResolvedValue(order); session.item.mockResolvedValue(item); session.catalog.part.mockResolvedValue(part); session.save.mockResolvedValue(3); session.task.mockResolvedValue({ id: 4, orderId: 1, title: "Task", status: "Open" }); });
it("normalizes exact decimal limits and allows consumption without a task or known price", async () => {
  expect(await manage.save(1, { ...input, quantity: "۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹", unitPrice: " ۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹ ", description: " Note " })).toEqual({ success: true, id: 3 });
  expect(session.save).toHaveBeenCalledWith({ ...input, quantity: "9999999999999999.99", unitPrice: "9999999999999999.99", description: "Note" });
  expect(await manage.save(1, { ...input, unitPrice: " " })).toEqual({ success: true, id: 3 });
  expect(session.save).toHaveBeenLastCalledWith(input);
});
it.each([{ quantity: "0" }, { quantity: "0.00" }, { quantity: "-1" }, { quantity: "1.001" }, { quantity: "10000000000000000" }, { quantity: "1e2" }, { unitPrice: "-1" }, { unitPrice: "1.001" }, { unitPrice: "10000000000000000" }, { partId: 0 }, { taskId: 0 }, { description: "x".repeat(1001) }])("rejects invalid consumption before writing: %j", async changes => {
  expect((await manage.save(1, { ...input, ...changes })).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
});
it("checks the catalog explicitly and allows retaining an inactive historical part only", async () => {
  session.catalog.part.mockResolvedValue(null); expect(await manage.save(1, input)).toEqual({ success: false, error: { type: "PART_UNAVAILABLE" } });
  session.catalog.part.mockResolvedValue({ ...part, isActive: false }); expect((await manage.save(1, input)).success).toBe(false);
  expect((await manage.save(1, { ...input, id: 3 })).success).toBe(true);
  session.item.mockResolvedValue({ ...item, partId: 9 }); expect((await manage.save(1, { ...input, id: 3 })).success).toBe(false);
});
it("rejects item and task cross-file writes, missing tasks and unknown task statuses", async () => {
  session.item.mockResolvedValue({ ...item, orderId: 9 });
  expect(await manage.save(1, { ...input, id: 3 })).toEqual({ success: false, error: { type: "ITEM_NOT_FOUND" } });
  expect(await manage.delete(1, 3)).toEqual({ success: false, error: { type: "ITEM_NOT_FOUND" } });
  session.item.mockResolvedValue(item);
  for (const task of [null, { id: 4, orderId: 9, status: "Open" }]) {
    session.task.mockResolvedValue(task); expect(await manage.save(1, { ...input, taskId: 4 })).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
  }
  session.task.mockResolvedValue({ id: 4, orderId: 1, status: "External" });
  expect(await manage.save(1, { ...input, taskId: 4 })).toEqual({ success: false, error: { type: "UNKNOWN_STATE" } });
});
it.each(["Completed", "Cancelled", "External"])("does not edit or delete consumption in a %s file", async status => {
  session.order.mockResolvedValue({ ...order, status });
  expect((await manage.save(1, input)).success).toBe(false); expect((await manage.delete(1, 3)).success).toBe(false);
  expect(session.save).not.toHaveBeenCalled(); expect(session.delete).not.toHaveBeenCalled();
});
it("only fills a previously unknown price after closure, including explicit zero", async () => {
  expect(await manage.fillPrice(1, 3, "0")).toEqual({ success: false, error: { type: "ORDER_NOT_CLOSED" } });
  session.order.mockResolvedValue({ ...order, status: "Cancelled" });
  expect(await manage.fillPrice(1, 3, "۰٫۰۰")).toEqual({ success: true, id: 3 }); expect(session.fillPrice).toHaveBeenCalledWith(3, "0.00");
  session.item.mockResolvedValue({ ...item, unitPrice: "0.00" });
  expect(await manage.fillPrice(1, 3, "12.34")).toEqual({ success: false, error: { type: "PRICE_ALREADY_RECORDED" } });
  session.item.mockResolvedValue({ ...item, orderId: 9 }); expect(await manage.fillPrice(1, 3, "1")).toEqual({ success: false, error: { type: "ITEM_NOT_FOUND" } });
  session.item.mockResolvedValue({ ...item, taskId: 4 }); session.task.mockResolvedValue({ id: 4, orderId: 9, status: "Open" });
  expect(await manage.fillPrice(1, 3, "1")).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
});
it("keeps missing/unknown parents and invalid IDs explicit for every command", async () => {
  for (const invalid of [0, -1, 1.1, 2147483648]) { expect((await manage.save(invalid, input)).success).toBe(false); expect((await manage.delete(1, invalid)).success).toBe(false); expect((await manage.fillPrice(invalid, 3, "1")).success).toBe(false); expect(await manage.get(invalid)).toBeNull(); }
  session.order.mockResolvedValue(null); expect(await manage.delete(1, 3)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  session.order.mockResolvedValue({ ...order, origin: "Unknown" }); expect(await manage.fillPrice(1, 3, "1")).toEqual({ success: false, error: { type: "UNKNOWN_STATE" } });
});
it("sums SQL-computed totals at four decimal places and distinguishes unknown prices from zero", () => {
  expect(workPartCosts([{ quantity: "1.01", unitPrice: "2.03", totalPrice: "2.0503" }, { quantity: "0.01", unitPrice: "0.01", totalPrice: "0.0001" }, { quantity: "1", unitPrice: "0.00", totalPrice: "0.0000" }, { quantity: "1", unitPrice: null, totalPrice: null }])).toEqual({ knownTotal: "2.0504", missingCount: 1 });
  expect(workPartCosts([{ quantity: "9999999999999999.99", unitPrice: "9999999999999999.99", totalPrice: "99999999999999999800000000000000.0001" }])).toEqual({ knownTotal: "99999999999999999800000000000000.0001", missingCount: 0 });
  for (const row of [{ quantity: "-1", unitPrice: null, totalPrice: null }, { quantity: "1", unitPrice: null, totalPrice: "0" }, { quantity: "1", unitPrice: "-1", totalPrice: "-1" }, { quantity: "1", unitPrice: "1", totalPrice: "2.0000" }, { quantity: "1", unitPrice: "1", totalPrice: "1.00001" }]) expect(workPartCosts([row])).toBeNull();
});
