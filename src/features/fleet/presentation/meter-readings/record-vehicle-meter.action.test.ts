import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../composition/meter-readings/vehicle-meter.factory", () => ({ makeRecordVehicleMeter: () => ({ execute: mocks.execute }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { recordVehicleMeterAction } from "./record-vehicle-meter.action";
const data = () => { const form = new FormData(); for (const [key, value] of Object.entries({ readingDay: "2026-11-03", readingTime: "12:30", odometer: "123456.78", engineHours: "25.10", description: "Note" })) form.set(key, value); return form; };
beforeEach(() => vi.resetAllMocks());
it("binds the vehicle, parses Tehran time and refreshes dependent forms without trusting client current values", async () => {
  mocks.execute.mockResolvedValue({ success: true, id: 1 }); const form = data(); form.set("vehicleId", "99"); form.set("currentOdometer", "0");
  expect(await recordVehicleMeterAction(7, {}, form)).toEqual({ saved: true }); expect(mocks.execute).toHaveBeenCalledWith({ vehicleId: 7, recordedAt: new Date("2026-11-03T09:00:00Z"), odometer: "123456.78", engineHours: "25.10", description: "Note" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/fleet/vehicles/7/edit"); expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/work-orders/[orderId]/costs", "page");
});
it("rejects repeated transport fields and preserves expected failures without refresh", async () => {
  const form = data(); form.append("odometer", "1"); expect(await recordVehicleMeterAction(7, {}, form)).toEqual({ unavailable: true }); expect(mocks.execute).not.toHaveBeenCalled();
  mocks.execute.mockResolvedValue({ success: false, error: { type: "METRIC_REQUIRED" } }); expect(await recordVehicleMeterAction(7, {}, data())).toEqual({ error: { type: "METRIC_REQUIRED" } }); expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("hides infrastructure details and does not automatically resubmit", async () => {
  mocks.execute.mockRejectedValue(new Error("Private database details")); expect(await recordVehicleMeterAction(7, {}, data())).toEqual({ unavailable: true }); expect(mocks.execute).toHaveBeenCalledTimes(1); expect(mocks.revalidate).not.toHaveBeenCalled();
});
