import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageWorkOrderTasks } from "./manage-work-order-tasks";
import { workTaskCosts } from "./work-task-costs";
import type { WorkOrderRecord } from "../work-orders/work-order-records";
import type { SaveWorkOrderTask, WorkOrderTask } from "./work-order-task-records";
import type { WorkOrderTaskRepository, WorkOrderTaskSession } from "./work-order-task-repository";
const vehicle = { id: 1, code: "V1", modelName: "Model", brandName: "Brand", isActive: true, plateNoLeftSide: "12", plateNoCenterChar: null, plateNoRightSide: null, plateNoIranNo: null };
const order: WorkOrderRecord = { id: 1, number: "WO-1405-0001", status: "Open", origin: "Direct", requestId: null, planId: null, sourceTitle: null, openedAt: "2026-11-03T10:00:00Z", startedAt: null, endedAt: null, vehicle, type: { id: 2, code: "T", name: "Type", isActive: true }, workshop: null, workshopId: null, workLocation: "OnSite", odometer: null, engineHours: null, problem: null, diagnosis: null, finalDescription: null, description: null };
const technician = { id: 4, name: "Technician", specialty: null, workshopName: null, isActive: true };
const input: SaveWorkOrderTask = { id: null, title: "Task", technicianId: null, laborHours: null, laborCost: null, status: "Open", description: null };
const task: WorkOrderTask = { ...input, id: 3, orderId: 1, technician: null, createdAt: "2026-11-03T10:00:00Z" };
const session = { order: vi.fn(), task: vi.fn(), technician: vi.fn(), save: vi.fn(), cancel: vi.fn(), fillCost: vi.fn() } satisfies WorkOrderTaskSession;
const repository = { atomic: vi.fn(), snapshot: vi.fn() } satisfies WorkOrderTaskRepository;
const manage = new ManageWorkOrderTasks(repository);
beforeEach(() => { vi.resetAllMocks(); repository.atomic.mockImplementation((id, work) => work(session)); session.order.mockResolvedValue(order); session.task.mockResolvedValue(task); session.technician.mockResolvedValue(technician); session.save.mockResolvedValue(3); });
describe("work-order tasks and labor", () => {
  it("normalizes exact values at both SQL precision limits without requiring optional fields", async () => {
    expect(await manage.save(1, { ...input, title: " Task ", laborHours: "۹۹۹۹۹۹۹۹٫۹۹", laborCost: "۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹", description: " " })).toEqual({ success: true, id: 3 });
    expect(session.save).toHaveBeenCalledWith({ ...input, laborHours: "99999999.99", laborCost: "9999999999999999.99" });
    expect(repository.atomic).toHaveBeenCalledWith(1, expect.any(Function));
  });
  it.each([{ title: " " }, { title: "x".repeat(201) }, { description: "x".repeat(1001) }, { laborHours: "100000000" }, { laborHours: "-1" }, { laborCost: "10000000000000000" }, { laborCost: "1.001" }, { status: "External" }, { technicianId: 0 }])("rejects invalid fields before writing: %j", async changes => {
    expect((await manage.save(1, { ...input, ...changes })).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
  });
  it.each(["InProgress", "Completed"])("blocks %s work until the file is truly started", async status => {
    expect(await manage.save(1, { ...input, status })).toEqual({ success: false, error: { type: "ORDER_NOT_STARTED" } });
    session.order.mockResolvedValue({ ...order, status: "InProgress" });
    expect(await manage.save(1, { ...input, status })).toEqual({ success: false, error: { type: "ORDER_NOT_STARTED" } });
    session.order.mockResolvedValue({ ...order, status: "InProgress", startedAt: "2026-11-03T10:01:00Z" });
    expect((await manage.save(1, { ...input, status })).success).toBe(true);
  });
  it("allows retaining an inactive technician but rejects new inactive or missing assignments", async () => {
    session.technician.mockResolvedValue({ ...technician, isActive: false });
    expect(await manage.save(1, { ...input, technicianId: 4 })).toEqual({ success: false, error: { type: "TECHNICIAN_UNAVAILABLE" } });
    session.task.mockResolvedValue({ ...task, technicianId: 4 });
    expect((await manage.save(1, { ...input, id: 3, technicianId: 4 })).success).toBe(true);
    session.technician.mockResolvedValue(null);
    expect(await manage.save(1, { ...input, id: 3, technicianId: 4 })).toEqual({ success: false, error: { type: "TECHNICIAN_UNAVAILABLE" } });
  });
  it("never edits or cancels a task belonging to a different file", async () => {
    session.task.mockResolvedValue({ ...task, orderId: 99 });
    expect(await manage.save(1, { ...input, id: 3 })).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
    expect(await manage.cancel(1, 3)).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
    session.order.mockResolvedValue({ ...order, status: "Completed" });
    expect(await manage.fillCost(1, 3, "1")).toEqual({ success: false, error: { type: "TASK_NOT_FOUND" } });
    expect(session.save).not.toHaveBeenCalled(); expect(session.cancel).not.toHaveBeenCalled(); expect(session.fillCost).not.toHaveBeenCalled();
  });
  it("cancels through a status-only update, preserving previous hours and cost", async () => {
    session.task.mockResolvedValue({ ...task, laborHours: "1.25", laborCost: "100.01" });
    expect(await manage.cancel(1, 3)).toEqual({ success: true, id: 3 });
    expect(session.cancel).toHaveBeenCalledWith(3); expect(session.save).not.toHaveBeenCalled();
  });
  it.each(["Completed", "Cancelled"])("only fills a previously missing cost on %s files", async status => {
    session.order.mockResolvedValue({ ...order, status });
    expect(await manage.save(1, { ...input, id: 3 })).toEqual({ success: false, error: { type: "ORDER_CLOSED" } });
    expect(await manage.cancel(1, 3)).toEqual({ success: false, error: { type: "ORDER_CLOSED" } });
    expect(await manage.fillCost(1, 3, "۰")).toEqual({ success: true, id: 3 }); expect(session.fillCost).toHaveBeenCalledWith(3, "0");
    session.task.mockResolvedValue({ ...task, laborCost: "0.00" });
    expect(await manage.fillCost(1, 3, "10.00")).toEqual({ success: false, error: { type: "COST_ALREADY_RECORDED" } });
  });
  it("preserves unknown states and refuses absent records and invalid identities", async () => {
    expect((await manage.save(0, input)).success).toBe(false); expect((await manage.cancel(1, -1)).success).toBe(false);
    expect((await manage.fillCost(1, 3, "")).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
    session.order.mockResolvedValue(null); expect(await manage.save(1, input)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    session.order.mockResolvedValue({ ...order, origin: "Unknown" }); expect(await manage.cancel(1, 3)).toEqual({ success: false, error: { type: "UNKNOWN_STATE" } });
    session.order.mockResolvedValue(order); session.task.mockResolvedValue({ ...task, status: "N'Open'" });
    expect(await manage.save(1, { ...input, id: 3 })).toEqual({ success: false, error: { type: "UNKNOWN_STATE" } });
    expect(await manage.fillCost(1, 3, "1")).toEqual({ success: false, error: { type: "ORDER_NOT_CLOSED" } });
    session.order.mockResolvedValue({ ...order, status: "Cancelled" });
    expect(await manage.fillCost(1, 3, "1")).toEqual({ success: false, error: { type: "UNKNOWN_STATE" } });
    expect(await manage.get(NaN)).toBeNull(); expect(repository.snapshot).not.toHaveBeenCalled();
  });
  it("sums beyond Number/SQL single-value precision, includes cancelled costs and distinguishes missing from zero", () => {
    expect(workTaskCosts([{ laborCost: "9999999999999999.99" }, { laborCost: "9999999999999999.99" }, { laborCost: "0.00" }, { laborCost: null }])).toEqual({ knownTotal: "19999999999999999.98", missingCount: 1 });
    expect(workTaskCosts([{ laborCost: "-1.00" }])).toBeNull(); expect(workTaskCosts([{ laborCost: "1.001" }])).toBeNull();
    expect(workTaskCosts([{ laborCost: null }])).toEqual({ knownTotal: "0.00", missingCount: 1 });
  });
});
