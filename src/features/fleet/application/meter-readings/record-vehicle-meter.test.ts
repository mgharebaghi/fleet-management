import { beforeEach, expect, it, vi } from "vitest";
import { RecordVehicleMeter } from "./record-vehicle-meter";
import { ListVehicleMeters } from "./list-vehicle-meters";
import { guardDirectMeterEdit, VehicleMeterHistoryError } from "./direct-meter-edit";
import type { VehicleMeterState, RecordVehicleMeterInput } from "./vehicle-meter-records";
import type { VehicleMeterWriteSession } from "./vehicle-meter-repository";
const session = { snapshot: vi.fn(), append: vi.fn(), updateCurrent: vi.fn() };
const repository = { atomic: vi.fn(), list: vi.fn() };
const record = new RecordVehicleMeter(repository), list = new ListVehicleMeters(repository);
const state: VehicleMeterState = { odometer: "100.00", engineHours: "10.00", now: "2026-11-03T12:00:00Z", history: [] };
const input: RecordVehicleMeterInput = { vehicleId: 7, recordedAt: new Date("2026-11-03T10:00:00Z"), odometer: "120.01", engineHours: null, description: " Note " };
beforeEach(() => { vi.resetAllMocks(); repository.atomic.mockImplementation((id, work: (session: VehicleMeterWriteSession) => unknown) => work(session)); session.snapshot.mockResolvedValue(state); session.append.mockResolvedValue(3); });
it("appends and synchronizes current meters atomically without clearing an omitted metric", async () => {
  expect(await record.execute(input)).toEqual({ success: true, id: 3 }); expect(repository.atomic).toHaveBeenCalledWith(7, expect.any(Function));
  expect(session.append).toHaveBeenCalledWith({ recordedAt: input.recordedAt, odometer: "120.01", engineHours: null, description: "Note" });
  expect(session.updateCurrent).toHaveBeenCalledWith({ odometer: "120.01", engineHours: "10.00" });
});
it("normalizes grouped Persian digits while preserving the largest exact SQL decimal", async () => {
  expect((await record.execute({ ...input, odometer: "۹٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٫۹۹", engineHours: "۲۵٫۱۰" })).success).toBe(true);
  expect(session.updateCurrent).toHaveBeenCalledWith({ odometer: "9999999999999999.99", engineHours: "25.10" });
});
it.each([{ odometer: "-1" }, { odometer: "1.001" }, { engineHours: "1e6" }, { odometer: "10000000000000000" }, { description: "x".repeat(501) }, { vehicleId: 0 }])("rejects invalid inputs %s", async changes => {
  expect((await record.execute({ ...input, ...changes })).success).toBe(false); expect(repository.atomic).not.toHaveBeenCalled();
});
it("requires one metric and a valid non-future timestamp", async () => {
  expect(await record.execute({ ...input, odometer: null })).toEqual({ success: false, error: { type: "METRIC_REQUIRED" } });
  expect(await record.execute({ ...input, recordedAt: new Date(NaN) })).toEqual({ success: false, error: { type: "INVALID_RECORDED_AT" } });
  expect(await record.execute({ ...input, recordedAt: new Date("2026-11-04T00:00:00Z") })).toEqual({ success: false, error: { type: "FUTURE_READING" } }); expect(session.append).not.toHaveBeenCalled();
});
it("rejects a latest reading below the current value and retains data on failure", async () => {
  expect(await record.execute({ ...input, odometer: "99.99", engineHours: "9.99" })).toEqual({ success: false, error: { type: "VALIDATION_ERROR", fields: { odometer: "DECREASE", engineHours: "DECREASE" } } });
  expect(session.append).not.toHaveBeenCalled(); expect(session.updateCurrent).not.toHaveBeenCalled();
});
const history = [
  { id: 1, recordedAt: "2026-11-01T10:00:00Z", odometer: "100.00", engineHours: "10.00", description: null },
  { id: 2, recordedAt: "2026-11-03T10:00:00Z", odometer: "200.00", engineHours: "20.00", description: null },
];
it("allows an older observation between its neighbors without lowering the current meters", async () => {
  session.snapshot.mockResolvedValue({ ...state, odometer: "200.00", engineHours: "20.00", history });
  expect((await record.execute({ ...input, recordedAt: new Date("2026-11-02T10:00:00Z"), odometer: "150", engineHours: "15" })).success).toBe(true);
  expect(session.updateCurrent).toHaveBeenCalledWith({ odometer: "200.00", engineHours: "20.00" });
});
it.each([["90", "DECREASE"], ["201", "AFTER_NEXT"]])("checks both history neighbors for %s", async (value, error) => {
  session.snapshot.mockResolvedValue({ ...state, odometer: "200", engineHours: "20", history });
  expect(await record.execute({ ...input, recordedAt: new Date("2026-11-02T10:00:00Z"), odometer: value })).toEqual({ success: false, error: { type: "VALIDATION_ERROR", fields: { odometer: error } } });
});
it("handles partial meter history and equal-time appends independently", async () => {
  session.snapshot.mockResolvedValue({ ...state, odometer: "200", engineHours: "20", history: [{ ...history[0], engineHours: null }, { ...history[1], odometer: null }] });
  expect((await record.execute({ ...input, odometer: "200", engineHours: "20" })).success).toBe(true);
  expect(session.updateCurrent).toHaveBeenCalledWith({ odometer: "200", engineHours: "20" });
});
it.each([
  { ...state, history: [{ ...history[0], odometer: "-1" }] },
  { ...state, history: [{ ...history[0], odometer: null, engineHours: null }] },
  { ...state, odometer: "200", history: [{ ...history[0], odometer: "200" }, { ...history[1], odometer: "100" }] },
  { ...state, history: [{ ...history[0], recordedAt: "2026-11-04T00:00:00Z" }] },
  { ...state, history },
])("refuses inconsistent existing state rather than silently rewriting it", async invalid => {
  session.snapshot.mockResolvedValue(invalid); expect(await record.execute(input)).toEqual({ success: false, error: { type: "HISTORY_INVALID" } }); expect(session.append).not.toHaveBeenCalled();
});
it("handles a disappeared vehicle and normalizes only history search/paging", async () => {
  session.snapshot.mockResolvedValue(null); expect(await record.execute(input)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  repository.list.mockResolvedValue({ rows: [], totalCount: 0 }); await list.execute(7, { search: " كد ۱۲٬۳۴۵ ", page: -1 }); expect(repository.list).toHaveBeenCalledWith(7, { search: "کد 12345", page: 1 });
});
it("protects meters after history while allowing equivalent numeric values and edits before history", () => {
  expect(() => guardDirectMeterEdit({ odometer: "100.00", engineHours: null }, { odometer: "100", engineHours: null }, true)).not.toThrow();
  expect(() => guardDirectMeterEdit({ odometer: "100", engineHours: null }, { odometer: "101", engineHours: null }, true)).toThrow(VehicleMeterHistoryError);
  expect(() => guardDirectMeterEdit({ odometer: "100", engineHours: null }, { odometer: "101", engineHours: "1" }, false)).not.toThrow();
});
