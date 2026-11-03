import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ saveType: vi.fn(), saveWorkshop: vi.fn(), saveTechnician: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("../../../composition/maintenance-reference.factory", () => ({ makeMaintenanceReferences: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
import { saveMaintenanceTypeAction } from "../../types/save-maintenance-type.action";
import { saveWorkshopAction } from "../../workshops/save-workshop.action";
import { saveTechnicianAction } from "../../technicians/save-technician.action";
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
beforeEach(() => { vi.resetAllMocks(); mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); }); });
describe("maintenance Server Action transport", () => {
  it("ignores browser-supplied IDs and preserves database-managed fields", async () => {
    const data = form({ code: "SERVICE", name: "Service", description: "", id: "255", CreatedAt: "2000-01-01" });
    mocks.saveType.mockResolvedValue({ success: true, value: { id: 1 } });
    await expect(saveMaintenanceTypeAction(null, {}, data)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.saveType).toHaveBeenCalledWith({ id: null, code: "SERVICE", name: "Service", description: "", isActive: true });
    expect(mocks.redirect).toHaveBeenCalledWith("/maintenance/catalogs/1");
  });
  it("rejects ambiguous fields and forged checkbox values before use cases", async () => {
    const data = form({ code: "SERVICE", name: "Service", description: "" }); data.append("code", "SECOND");
    expect(await saveMaintenanceTypeAction(null, {}, data)).toEqual({ unavailable: true });
    data.set("code", "SERVICE"); data.set("isActive", "false");
    expect(await saveMaintenanceTypeAction(1, {}, data)).toEqual({ unavailable: true });
    expect(mocks.saveType).not.toHaveBeenCalled();
  });
  it("parses optional workshop affiliation as null, not zero", async () => {
    mocks.saveTechnician.mockResolvedValue({ success: false, error: { type: "WORKSHOP_UNAVAILABLE" } });
    const result = await saveTechnicianAction(null, {}, form({ firstName: "First", lastName: "Last", workshopId: "", mobile: "", specialty: "", description: "" }));
    expect(mocks.saveTechnician).toHaveBeenCalledWith(expect.objectContaining({ workshopId: null }));
    expect(result).toEqual({ error: { type: "WORKSHOP_UNAVAILABLE" } });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("preserves a requested deactivation and reports technical failures without leaking details", async () => {
    mocks.saveWorkshop.mockRejectedValue(new Error("Private persistence details"));
    expect(await saveWorkshopAction(2, {}, form({ name: "Workshop", workshopType: "Free", phone: "", address: "", contactPerson: "", description: "", isInternal: "on" }))).toEqual({ unavailable: true });
    expect(mocks.saveWorkshop).toHaveBeenCalledWith(expect.objectContaining({ id: 2, isInternal: true, isActive: false }));
  });
});
