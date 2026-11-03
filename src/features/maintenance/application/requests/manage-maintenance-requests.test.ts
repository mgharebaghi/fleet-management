import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManageMaintenanceRequests } from "./manage-maintenance-requests";
import type { MaintenanceRequestInput, MaintenanceRequestRecord } from "./maintenance-request-records";
import type { MaintenanceRequestRepository, MaintenanceRequestWriteSession } from "./maintenance-request-repository";
const vehicle = { id: 1, code: "V-1", modelName: "Model", brandName: "Brand", isActive: true, plateNoLeftSide: "12", plateNoCenterChar: null, plateNoRightSide: null, plateNoIranNo: null };
const type = { id: 2, code: "SERVICE", name: "Service", isActive: true };
const input: MaintenanceRequestInput = { id: null, vehicleId: 1, maintenanceTypeId: 2, problem: "Problem", reportedOdometer: null, reportedEngineHours: null, priority: null, description: null };
const record: MaintenanceRequestRecord = { id: 3, vehicle, type, status: "Open", problem: "Problem", reportedOdometer: null, reportedEngineHours: null, priority: null, description: null, requestedAt: "2026-11-01T10:00:00Z", orderCount: 0, orderStatuses: [], orders: [] };
const session = { request: vi.fn(), vehicle: vi.fn(), type: vi.fn(), save: vi.fn(), changeStatus: vi.fn(), remove: vi.fn() } satisfies MaintenanceRequestWriteSession;
const repository = { atomic: vi.fn(), get: vi.fn(), references: vi.fn(), list: vi.fn() } satisfies MaintenanceRequestRepository;
const manage = new ManageMaintenanceRequests(repository);
beforeEach(() => { vi.resetAllMocks(); repository.atomic.mockImplementation((id, work) => work(session)); session.request.mockResolvedValue(record); session.vehicle.mockResolvedValue(vehicle); session.type.mockResolvedValue(type); session.save.mockResolvedValue(3); });
describe("maintenance request rules", () => {
  it.each(["Open", "InProgress", "Completed", "Cancelled"])("deletes a %s request only when it has no repair file", async status => {
    session.request.mockResolvedValue({ ...record, status }); session.remove.mockResolvedValue(true);
    expect(await manage.remove(3)).toEqual({ success: true, id: 3 });
    expect(repository.atomic).toHaveBeenCalledWith(3, expect.any(Function));
    expect(session.remove).toHaveBeenCalledWith(3);
  });
  it.each(["Open", "InProgress", "Completed", "Cancelled"])("preserves requests with a %s repair file", async status => {
    session.request.mockResolvedValue({ ...record, orderCount: 1, orders: [{ id: 1, number: "WO", status }] });
    expect(await manage.remove(3)).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(session.remove).not.toHaveBeenCalled();
  });
  it("rejects invalid, missing and unknown requests, and refuses a failed conditional delete", async () => {
    expect((await manage.remove(0)).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
    session.request.mockResolvedValue(null); expect(await manage.remove(3)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    session.request.mockResolvedValue({ ...record, status: "External" }); expect(await manage.remove(3)).toEqual({ success: false, error: { type: "UNKNOWN_STATUS" } });
    expect(session.remove).not.toHaveBeenCalled();
    session.request.mockResolvedValue(record); session.remove.mockResolvedValue(false);
    expect(await manage.remove(3)).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
  });
  it("normalizes reported values precisely without treating them as a vehicle meter update", async () => {
    expect(await manage.save({ ...input, problem: " Problem ", reportedOdometer: "۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹۹٫۹۹", reportedEngineHours: "۰", priority: " ", description: " " })).toEqual({ success: true, id: 3 });
    expect(session.save).toHaveBeenCalledWith({ ...input, reportedOdometer: "9999999999999999.99", reportedEngineHours: "0" });
  });
  it.each([{ vehicleId: 0 }, { maintenanceTypeId: 256 }, { reportedOdometer: "-1" }, { reportedEngineHours: "1.001" }, { reportedOdometer: "10000000000000000" }, { problem: "x".repeat(1001) }, { description: "x".repeat(1001) }, { priority: "x".repeat(51) }])("rejects invalid fields before a transaction", async values => {
    expect((await manage.save({ ...input, ...values })).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
  });
  it("rejects inactive new references but allows retaining existing inactive references", async () => {
    session.vehicle.mockResolvedValue({ ...vehicle, isActive: false }); session.type.mockResolvedValue({ ...type, isActive: false });
    expect(await manage.save(input)).toEqual({ success: false, error: { type: "VEHICLE_UNAVAILABLE" } });
    expect((await manage.save({ ...input, id: 3 })).success).toBe(true);
    session.vehicle.mockResolvedValue(vehicle);
    expect(await manage.save(input)).toEqual({ success: false, error: { type: "TYPE_UNAVAILABLE" } });
  });
  it("locks the vehicle and type once any related order exists", async () => {
    session.request.mockResolvedValue({ ...record, orderCount: 1, orders: [{ id: 1, number: "WO", status: "Completed" }] });
    expect(await manage.save({ ...input, id: 3, vehicleId: 4 })).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.save({ ...input, id: 3, maintenanceTypeId: 4 })).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.save({ ...input, id: 3, problem: "Updated" })).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
  });
  it.each(["Open", "InProgress", "ExternalUnknown"])("blocks closure while an order has unresolved status %s", async status => {
    session.request.mockResolvedValue({ ...record, orders: [{ id: 1, number: "WO", status }] });
    expect(await manage.changeStatus(3, "Completed")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await manage.changeStatus(3, "Cancelled")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(session.changeStatus).not.toHaveBeenCalled();
  });
  it("allows tracking without a file and preserves linked requests even after repair resolves", async () => {
    expect(await manage.changeStatus(3, "InProgress")).toEqual({ success: true, id: 3 });
    session.request.mockResolvedValue({ ...record, status: "InProgress", orders: [{ id: 1, number: "WO-1", status: "Completed" }, { id: 2, number: "WO-2", status: "Cancelled" }] });
    expect(await manage.changeStatus(3, "Completed")).toEqual({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(session.changeStatus).toHaveBeenCalledTimes(1);
  });
  it.each(["Completed", "Cancelled"])("does not edit or reopen a request closed as %s", async status => {
    session.request.mockResolvedValue({ ...record, status });
    expect(await manage.save({ ...input, id: 3 })).toEqual({ success: false, error: { type: "REQUEST_CLOSED" } });
    expect(await manage.changeStatus(3, "Open")).toEqual({ success: false, error: { type: "REQUEST_CLOSED" } });
    expect(session.save).not.toHaveBeenCalled(); expect(session.changeStatus).not.toHaveBeenCalled();
  });
  it("preserves unknown statuses and missing records rather than guessing a lifecycle", async () => {
    session.request.mockResolvedValue({ ...record, status: "N'Open'" });
    expect(await manage.save({ ...input, id: 3 })).toEqual({ success: false, error: { type: "UNKNOWN_STATUS" } });
    expect(await manage.changeStatus(3, "Cancelled")).toEqual({ success: false, error: { type: "UNKNOWN_STATUS" } });
    session.request.mockResolvedValue(null);
    expect(await manage.save({ ...input, id: 3 })).toEqual({ success: false, error: { type: "NOT_FOUND" } });
    expect(await manage.changeStatus(3, "Completed")).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });
  it("rejects invalid transitions and normalizes listing filters", async () => {
    expect((await manage.changeStatus(3, "External")).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
    expect(await manage.changeStatus(3, "Open")).toEqual({ success: false, error: { type: "INVALID_TRANSITION" } });
    await manage.list({ search: " كد ۱۲ ", status: "bad", vehicleId: -1, maintenanceTypeId: 256, page: 0 });
    expect(repository.list).toHaveBeenCalledWith({ search: "کد 12", status: "", vehicleId: null, maintenanceTypeId: null, page: 1 });
    expect(await manage.get(NaN)).toBeNull(); expect(repository.get).not.toHaveBeenCalled();
  });
});
