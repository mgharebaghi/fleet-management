import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("../../composition/service-plans/service-plan.factory", () => ({ makeServicePlans: () => ({ save: mocks.save }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { saveServicePlanAction } from "./save-service-plan.action";
function submission() {
  const data = new FormData();
  for (const field of ["vehicleId", "maintenanceTypeId", "title", "description", "intervalKm", "intervalDays", "intervalHours", "warningKm", "warningDays", "warningHours", "lastOdometer", "lastDate", "lastHours"]) data.set(field, "");
  data.set("vehicleId", "1"); data.set("maintenanceTypeId", "2"); data.set("title", "Service"); data.set("isActive", "on");
  return data;
}
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ success: false, error: { type: "NOT_FOUND" } }); });
it.each([["useKm", "intervalKm"], ["useDays", "intervalDays"], ["useHours", "intervalHours"]])("accepts %s as the only selected criterion", async (selected, interval) => {
  const data = submission(); data.set(selected, "on"); data.set(interval, "100");
  await saveServicePlanAction(null, {}, data);
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ [interval]: "100" }));
});
it("rejects an empty selected interval even when another criterion is filled", async () => {
  const data = submission(); data.set("useKm", "on"); data.set("useDays", "on"); data.set("intervalDays", "30");
  expect(await saveServicePlanAction(null, {}, data)).toEqual({ error: { type: "VALIDATION_ERROR", fields: { intervalKm: "REQUIRED" } } });
  expect(mocks.save).not.toHaveBeenCalled();
});
it("ignores stale disabled intervals and warnings while preserving service history", async () => {
  const data = submission(); data.set("useDays", "on"); data.set("intervalDays", "30"); data.set("intervalKm", "1000"); data.set("warningKm", "invalid"); data.set("lastOdometer", "5000");
  await saveServicePlanAction(3, {}, data);
  expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 3, intervalDays: "30", intervalKm: "", warningKm: "", lastOdometer: "5000" }));
});
