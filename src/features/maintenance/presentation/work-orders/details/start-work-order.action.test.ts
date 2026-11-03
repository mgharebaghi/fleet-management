import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../../composition/work-order.factory", () => ({ makeStartWorkOrder: () => ({ execute: mocks.execute }) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { startWorkOrderAction } from "./start-work-order.action";
beforeEach(() => vi.resetAllMocks());
it("binds the parent identity and forwards only an explicit checkbox acknowledgement", async () => {
  mocks.execute.mockResolvedValue({ success: true, id: 3 }); const data = new FormData(); data.set("vehicleId", "99"); data.set("acknowledgePlannedTrips", "on");
  expect(await startWorkOrderAction(3, {}, data)).toEqual({ saved: true }); expect(mocks.execute).toHaveBeenCalledWith(3, true);
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/work-orders/3/tasks"); expect(mocks.revalidate).toHaveBeenCalledWith("/trips/[tripRequestId]", "page");
});
it("returns the planned count without treating a previous warning as approval", async () => {
  mocks.execute.mockResolvedValue({ success: false, error: "PLANNED_TRIPS_REQUIRE_CONFIRMATION", plannedTrips: 2 });
  expect(await startWorkOrderAction(3, { plannedTrips: 2 }, new FormData())).toEqual({ error: "PLANNED_TRIPS_REQUIRE_CONFIRMATION", plannedTrips: 2 });
  expect(mocks.execute).toHaveBeenCalledWith(3, false); expect(mocks.revalidate).not.toHaveBeenCalled();
});
it("rejects malformed approval and hides infrastructure errors without refreshing failures", async () => {
  const data = new FormData(); data.append("acknowledgePlannedTrips", "on"); data.append("acknowledgePlannedTrips", "on");
  expect(await startWorkOrderAction(3, {}, data)).toEqual({ error: "UNAVAILABLE" }); expect(mocks.execute).not.toHaveBeenCalled();
  mocks.execute.mockRejectedValue(new Error("Private persistence")); expect(await startWorkOrderAction(3, {}, new FormData())).toEqual({ error: "UNAVAILABLE" }); expect(mocks.revalidate).not.toHaveBeenCalled();
});
