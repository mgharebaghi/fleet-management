import { beforeEach, expect, it, vi } from "vitest";
import { servicePlanDue } from "./service-plan-due";
import { ManageServicePlans } from "./manage-service-plans";
import type { ServicePlan, ServicePlanInput } from "./service-plan-records";
import type { ServicePlanWriteSession } from "./service-plan-repository";
const base = { isActive: true, today: "2026-11-03", intervalKm: "100", intervalDays: null, intervalHours: null, warningKm: "20", warningDays: null, warningHours: null, lastOdometer: "100", lastDate: null, lastHours: null, currentOdometer: "150", currentHours: null };
it.each([["179.99", "Normal"], ["180", "Warning"], ["200", "Due"]])("calculates exact distance threshold %s as %s", (km, status) => expect(servicePlanDue({ ...base, currentOdometer: km }).status).toBe(status));
it("uses OR across criteria and never substitutes creation time for missing service history", () => {
  expect(servicePlanDue({ ...base, intervalDays: "30" }).status).toBe("Unknown");
  expect(servicePlanDue({ ...base, intervalDays: "30", currentOdometer: "200" }).status).toBe("Due");
  expect(servicePlanDue({ ...base, lastOdometer: null }).status).toBe("Unknown");
  expect(servicePlanDue({ ...base, isActive: false, currentOdometer: "200" }).status).toBe("Inactive");
});
it("handles calendar days independently of milliseconds and engine hours with exact precision", () => {
  const date = servicePlanDue({ ...base, intervalKm: null, intervalDays: "2", warningDays: "1", lastDate: "2026-11-01" }); expect(date.status).toBe("Due"); expect(date.criteria[0].next).toBe("2026-11-03");
  const hours = servicePlanDue({ ...base, intervalKm: null, intervalHours: "0.01", lastHours: "9999999999999999.98", currentHours: "9999999999999999.99" }); expect(hours.status).toBe("Due"); expect(hours.criteria[0].next).toBe("9999999999999999.99");
  expect(servicePlanDue({ ...base, currentOdometer: "99" }).status).toBe("Unknown");
});
const session = { get: vi.fn(), vehicleAvailable: vi.fn(), typeAvailable: vi.fn(), today: vi.fn(), save: vi.fn(), remove: vi.fn() };
const repository = { atomic: vi.fn(), get: vi.fn(), candidates: vi.fn(), orders: vi.fn(), references: vi.fn() };
const manage = new ManageServicePlans(repository);
const input: ServicePlanInput = { id: null, vehicleId: 1, maintenanceTypeId: 2, title: " Service ", description: null, isActive: true, intervalKm: "100", intervalDays: null, intervalHours: null, warningKm: "20", warningDays: null, warningHours: null, lastOdometer: "100", lastDate: null, lastHours: null };
beforeEach(() => { vi.clearAllMocks(); repository.atomic.mockImplementation((id, work: (session: ServicePlanWriteSession) => unknown) => work(session)); session.get.mockResolvedValue(null); session.vehicleAvailable.mockResolvedValue(true); session.typeAvailable.mockResolvedValue(true); session.today.mockResolvedValue("2026-11-03"); session.save.mockResolvedValue(3); });
it("normalizes plan decimals and preserves a missing baseline", async () => {
  expect(await manage.save({ ...input, intervalKm: "۱٬۰۰۰٫۰۱", lastOdometer: null })).toEqual({ success: true, id: 3 }); expect(session.save).toHaveBeenCalledWith(expect.objectContaining({ title: "Service", intervalKm: "1000.01", lastOdometer: null }));
});
it.each([{ intervalKm: "0" }, { warningKm: "100" }, { intervalDays: "1.5" }, { intervalHours: "1.001" }, { lastDate: "2026-02-30" }, { title: "x".repeat(201) }])("rejects invalid plan values %s", async changes => { expect((await manage.save({ ...input, ...changes })).success).toBe(false); expect(session.save).not.toHaveBeenCalled(); });
it("requires an interval and rejects a future baseline", async () => {
  expect(await manage.save({ ...input, intervalKm: null, warningKm: null })).toEqual({ success: false, error: { type: "INTERVAL_REQUIRED" } });
  expect((await manage.save({ ...input, lastDate: "2026-11-04" })).success).toBe(false); expect(session.save).not.toHaveBeenCalled();
});
it("freezes used source/baseline and allows equivalent baseline values for ordinary edits", async () => {
  session.get.mockResolvedValue({ ...input, id: 3, orderCount: 1, lastOdometer: "100.00" });
  expect(await manage.save({ ...input, id: 3, vehicleId: 4 })).toEqual({ success: false, error: { type: "SOURCE_FIXED" } });
  expect(await manage.save({ ...input, id: 3, lastOdometer: "101" })).toEqual({ success: false, error: { type: "BASELINE_LOCKED" } });
  expect((await manage.save({ ...input, id: 3, isActive: false })).success).toBe(true);
});
it("filters calculated status before paging rather than losing due plans on later pages", async () => {
  repository.candidates.mockResolvedValue(Array.from({ length: 22 }, (_, index) => ({ ...base, id: index, currentOdometer: index ? "200" : "150" }) as ServicePlan));
  const result = await manage.list({ search: "", status: "Due", vehicleId: null, page: 2 }); expect(result.totalCount).toBe(21); expect(result.rows).toHaveLength(1);
});
it("deletes only plans without linked orders under the atomic session", async () => {
  session.get.mockResolvedValue({ id: 3, orderCount: 1 });
  expect(await manage.remove(3)).toEqual({ success: false, error: { type: "PLAN_IN_USE" } });
  expect(session.remove).not.toHaveBeenCalled();
  session.get.mockResolvedValue({ id: 3, orderCount: 0 }); session.remove.mockResolvedValue(true);
  expect(await manage.remove(3)).toEqual({ success: true, id: 3 });
  session.remove.mockResolvedValue(false);
  expect(await manage.remove(3)).toEqual({ success: false, error: { type: "PLAN_IN_USE" } });
  session.get.mockResolvedValue(null);
  expect(await manage.remove(3)).toEqual({ success: false, error: { type: "NOT_FOUND" } });
});
