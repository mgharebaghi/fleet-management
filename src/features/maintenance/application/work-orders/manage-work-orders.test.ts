import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageWorkOrders } from "./manage-work-orders";
import { nextWorkOrderNumber } from "./work-order-number";
import type { CreateWorkOrderInput, WorkOrderRecord } from "./work-order-records";
import type { WorkOrderRepository, WorkOrderWriteSession } from "./work-order-repository";
const vehicle = { id: 1, code: "V1", modelName: "Model", brandName: "Brand", isActive: true, plateNoLeftSide: "12", plateNoCenterChar: null, plateNoRightSide: null, plateNoIranNo: null };
const type = { id: 2, code: "T1", name: "Type", isActive: true };
const input: CreateWorkOrderInput = { origin: "Direct", sourceId: null, vehicleId: 1, maintenanceTypeId: 2, workLocation: "OnSite", workshopId: null, odometer: null, engineHours: null, problem: null, diagnosis: null, description: null };
const record: WorkOrderRecord = { ...input, id: 3, number: "WO-1405-0001", origin: "Direct", status: "Open", openedAt: "2026-11-01T10:00:00Z", startedAt: null, endedAt: null, requestId: null, planId: null, sourceTitle: null, vehicle, type, workshop: null, finalDescription: null };
const session = { completionContext: vi.fn(), completeOrder: vi.fn(), startReadiness: vi.fn(), startOrder: vi.fn(), order: vi.fn(), vehicle: vi.fn(), type: vi.fn(), workshop: vi.fn(), source: vi.fn(), numbers: vi.fn(), create: vi.fn(), updateDetails: vi.fn(), taskStates: vi.fn(), cancelOrder: vi.fn() } satisfies WorkOrderWriteSession;
const repository = { atomic: vi.fn(), get: vi.fn(), list: vi.fn(), references: vi.fn() } satisfies WorkOrderRepository;
const manage = new ManageWorkOrders(repository, () => new Date("2026-11-02T10:00:00Z"));
beforeEach(() => {
  vi.resetAllMocks(); repository.atomic.mockImplementation((locks, work) => work(session));
  session.vehicle.mockResolvedValue(vehicle); session.type.mockResolvedValue(type); session.order.mockResolvedValue(record);
  session.numbers.mockResolvedValue([]); session.create.mockResolvedValue(3); session.workshop.mockResolvedValue({ id: 4, name: "Workshop", isActive: true });
  session.source.mockResolvedValue({ id: 5, vehicleId: 1, maintenanceTypeId: 2, available: true, title: "Source", problem: null, odometer: null, engineHours: null });
});
describe("work-order preparation rules", () => {
  it("creates a directly registered order with exact readings and a server-generated annual number", async () => {
    expect(await manage.create({ ...input, odometer: "۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹", engineHours: "۲۵٫۱۰", diagnosis: " Diagnosis ", description: " " })).toEqual({ success: true, id: 3 });
    expect(repository.atomic).toHaveBeenCalledWith({ year: 1405 }, expect.any(Function));
    expect(session.create).toHaveBeenCalledWith({ ...input, number: "WO-1405-0001", odometer: "9999999999999999.99", engineHours: "25.10", diagnosis: "Diagnosis" });
  });
  it.each(["Request", "Plan"] as const)("creates from %s with the same source lock and verified vehicle/type", async origin => {
    expect((await manage.create({ ...input, origin, sourceId: 5 })).success).toBe(true);
    expect(repository.atomic).toHaveBeenCalledWith({ year: 1405, [origin === "Request" ? "requestId" : "planId"]: 5 }, expect.any(Function));
    expect(session.source).toHaveBeenCalledWith(origin, 5);
    expect(session.create).toHaveBeenCalledWith(expect.objectContaining({ origin, sourceId: 5 }));
  });
  it.each([{ origin: "Unknown" }, { sourceId: 1 }, { origin: "Request", sourceId: null }, { vehicleId: 0 }, { maintenanceTypeId: 256 }, { workLocation: "Unknown" }, { workLocation: "Workshop" }, { workshopId: -1 }, { odometer: "-1" }, { engineHours: "25.001" }, { odometer: "10000000000000000" }])("rejects invalid input before opening a transaction: %j", async changes => {
    expect((await manage.create({ ...input, ...changes })).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("refuses missing/closed sources and mismatches even when posted selectors were tampered with", async () => {
    for (const source of [null, { available: false }]) {
      session.source.mockResolvedValue(source); expect(await manage.create({ ...input, origin: "Request", sourceId: 5 })).toEqual({ success: false, error: { type: "SOURCE_UNAVAILABLE" } });
    }
    session.source.mockResolvedValue({ available: true, vehicleId: 99, maintenanceTypeId: 2 });
    expect(await manage.create({ ...input, origin: "Plan", sourceId: 5 })).toEqual({ success: false, error: { type: "SOURCE_MISMATCH" } });
    expect(session.create).not.toHaveBeenCalled();
  });
  it("requires active new references and allows an unchanged inactive workshop on edits", async () => {
    session.vehicle.mockResolvedValue({ ...vehicle, isActive: false });
    expect(await manage.create(input)).toEqual({ success: false, error: { type: "VEHICLE_UNAVAILABLE" } });
    session.vehicle.mockResolvedValue(vehicle); session.type.mockResolvedValue({ ...type, isActive: false });
    expect(await manage.create(input)).toEqual({ success: false, error: { type: "TYPE_UNAVAILABLE" } });
    session.type.mockResolvedValue(type); session.workshop.mockResolvedValue({ id: 4, name: "Workshop", isActive: false });
    expect(await manage.create({ ...input, workLocation: "Workshop", workshopId: 4 })).toEqual({ success: false, error: { type: "WORKSHOP_UNAVAILABLE" } });
    session.order.mockResolvedValue({ ...record, workshopId: 4 });
    expect((await manage.updateDetails(3, { ...input, workshopId: 4, workLocation: "Workshop" })).success).toBe(true);
    session.workshop.mockResolvedValue({ id: 5, name: "Other workshop", isActive: false });
    expect(await manage.updateDetails(3, { ...input, workshopId: 5 })).toEqual({ success: false, error: { type: "WORKSHOP_UNAVAILABLE" } });
  });
  it.each(["Completed", "Cancelled", "External"])("does not change an order with status %s", async status => {
    session.order.mockResolvedValue({ ...record, status });
    expect(await manage.updateDetails(3, input)).toEqual({ success: false, error: { type: status === "External" ? "UNKNOWN_STATUS" : "ORDER_CLOSED" } });
    expect(session.updateDetails).not.toHaveBeenCalled();
  });
  it("rejects unknown dual origins, absent orders and invalid edit identifiers", async () => {
    session.order.mockResolvedValue({ ...record, origin: "Unknown" });
    expect(await manage.updateDetails(3, input)).toEqual({ success: false, error: { type: "UNKNOWN_STATUS" } });
    session.order.mockResolvedValue(null); expect(await manage.updateDetails(3, input)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    expect((await manage.updateDetails(NaN, input)).success).toBe(false);
  });
  it("stops at annual capacity and normalizes the list without guessing unknown statuses", async () => {
    session.numbers.mockResolvedValue(["WO-1405-9999"]);
    expect(await manage.create(input)).toEqual({ success: false, error: { type: "NUMBER_CAPACITY" } }); expect(session.create).not.toHaveBeenCalled();
    await manage.list({ search: " كد ۱۲ ", status: "External", vehicleId: -1, page: 0 });
    expect(repository.list).toHaveBeenCalledWith({ search: "کد 12", status: "", vehicleId: null, page: 1 });
    expect(await manage.get(-1)).toBeNull(); expect(repository.get).not.toHaveBeenCalled();
  });
  it("increments the yearly maximum, ignores unrelated/malformed values and preserves four digits", () => {
    expect(nextWorkOrderNumber(1405, [" wo-1405-0009 ", "WO-1404-9999", "WO-1405-test", "WO-1405-10000"])).toBe("WO-1405-0010");
    expect(nextWorkOrderNumber(1405, ["WO-1405-9999"])).toBeNull();
  });
});
