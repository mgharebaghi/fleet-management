import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), updateDetails: vi.fn(), redirect: vi.fn(), revalidate: vi.fn() }));
vi.mock("../../../composition/work-order.factory", () => ({ makeWorkOrders: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { saveWorkOrderAction } from "./save-work-order.action";
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ origin: "Request", sourceId: "5", vehicleId: "1", maintenanceTypeId: "2", workLocation: "OnSite", workshopId: "", odometer: "9999999999999999.99", engineHours: "25.10", problem: "Problem", diagnosis: "Diagnosis", description: "", Status: "Completed", WorkOrderNo: "Fake", ActualStartDateTime: "2000-01-01" })) data.set(key, value);
  return data;
}
beforeEach(() => { vi.resetAllMocks(); mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); }); });
it("creates with exact decimal strings, ignores managed fields and returns to the list", async () => {
  mocks.create.mockResolvedValue({ success: true, id: 3 });
  await expect(saveWorkOrderAction(null, {}, form())).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.create).toHaveBeenCalledWith({ origin: "Request", sourceId: 5, vehicleId: 1, maintenanceTypeId: 2, workLocation: "OnSite", workshopId: null, odometer: "9999999999999999.99", engineHours: "25.10", problem: "Problem", diagnosis: "Diagnosis", description: "" });
  expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/requests/[requestId]", "page");
  expect(mocks.redirect).toHaveBeenCalledWith("/maintenance/work-orders");
});
it("updates only preparation fields and cannot overwrite source, identity or status", async () => {
  mocks.updateDetails.mockResolvedValue({ success: true, id: 3 });
  await expect(saveWorkOrderAction(3, {}, form())).rejects.toThrow("NEXT_REDIRECT");
  expect(mocks.updateDetails).toHaveBeenCalledWith(3, { workLocation: "OnSite", workshopId: null, odometer: "9999999999999999.99", engineHours: "25.10", problem: "Problem", diagnosis: "Diagnosis", description: "" });
  expect(mocks.redirect).toHaveBeenCalledWith("/maintenance/work-orders/3");
});
it("rejects duplicate fields and returns business/technical failures without invalidating data", async () => {
  const data = form(); data.append("vehicleId", "2");
  expect(await saveWorkOrderAction(null, {}, data)).toEqual({ unavailable: true }); expect(mocks.create).not.toHaveBeenCalled();
  mocks.create.mockResolvedValue({ success: false, error: { type: "SOURCE_UNAVAILABLE" } });
  expect(await saveWorkOrderAction(null, {}, form())).toEqual({ error: { type: "SOURCE_UNAVAILABLE" } }); expect(mocks.revalidate).not.toHaveBeenCalled();
  mocks.create.mockRejectedValue(new Error("Private SQL details"));
  expect(await saveWorkOrderAction(null, {}, form())).toEqual({ unavailable: true });
});
