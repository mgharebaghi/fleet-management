import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), changeStatus: vi.fn(), remove: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("../../../composition/maintenance-request.factory", () => ({ makeMaintenanceRequests: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { saveMaintenanceRequestAction } from "./save-maintenance-request.action";
import { changeRequestStatusAction } from "../details/change-request-status.action";
import { deleteMaintenanceRequestAction } from "../list/delete-maintenance-request.action";
function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ vehicleId: "1", maintenanceTypeId: "2", problem: "Problem", reportedOdometer: "9999999999999999.99", reportedEngineHours: "", priority: "", description: "", id: "999", Status: "Completed", RequestDateTime: "2000-01-01" })) data.set(key, value);
  return data;
}
beforeEach(() => { vi.resetAllMocks(); mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); }); });
describe("request action transport", () => {
  it("rechecks deletion rules and invalidates the list and detail only on success", async () => {
    mocks.remove.mockResolvedValue({ success: false, error: { type: "REQUEST_IN_USE" } });
    expect(await deleteMaintenanceRequestAction(3, {}, form())).toEqual({ error: { type: "REQUEST_IN_USE" } });
    expect(mocks.revalidate).not.toHaveBeenCalled();
    mocks.remove.mockResolvedValue({ success: true, id: 3 });
    expect(await deleteMaintenanceRequestAction(3, {}, form())).toEqual({ saved: true });
    expect(mocks.remove).toHaveBeenCalledWith(3);
    expect(mocks.revalidate.mock.calls).toEqual([["/maintenance/requests"], ["/maintenance/requests/3"], ["/maintenance/requests/3/edit"]]);
    mocks.remove.mockRejectedValue(new Error("Private SQL error"));
    expect(await deleteMaintenanceRequestAction(3, {}, form())).toEqual({ unavailable: true });
  });
  it("preserves exact decimal strings and ignores managed IDs, times and status", async () => {
    mocks.save.mockResolvedValue({ success: true, id: 3 });
    await expect(saveMaintenanceRequestAction(null, {}, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.save).toHaveBeenCalledWith({ id: null, vehicleId: 1, maintenanceTypeId: 2, problem: "Problem", reportedOdometer: "9999999999999999.99", reportedEngineHours: "", priority: "", description: "" });
    expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/catalogs");
    expect(mocks.redirect).toHaveBeenCalledWith("/maintenance/requests");
  });
  it("keeps the detail destination after editing an existing request", async () => {
    mocks.save.mockResolvedValue({ success: true, id: 3 });
    await expect(saveMaintenanceRequestAction(3, {}, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/maintenance/requests/3");
  });
  it("rejects duplicate transport fields before calling the use case", async () => {
    const data = form(); data.append("vehicleId", "2");
    expect(await saveMaintenanceRequestAction(null, {}, data)).toEqual({ unavailable: true });
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("returns closure failures without refreshing state or writing a guessed status", async () => {
    mocks.changeStatus.mockResolvedValue({ success: false, error: { type: "ORDERS_UNRESOLVED" } });
    expect(await changeRequestStatusAction(3, "Completed", {}, form())).toEqual({ error: { type: "ORDERS_UNRESOLVED" } });
    expect(mocks.changeStatus).toHaveBeenCalledWith(3, "Completed"); expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it("refreshes a successful status change and reports technical errors without leaking details", async () => {
    mocks.changeStatus.mockResolvedValue({ success: true, id: 3 });
    expect(await changeRequestStatusAction(3, "Cancelled", {}, form())).toEqual({ saved: true });
    expect(mocks.revalidate).toHaveBeenCalledWith("/maintenance/requests/3/edit");
    mocks.save.mockRejectedValue(new Error("Private SQL message"));
    expect(await saveMaintenanceRequestAction(3, {}, form())).toEqual({ unavailable: true });
  });
});
