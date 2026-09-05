import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVehicleAction } from "./create-vehicle.action";
import { vehicleTextFields } from "./create-vehicle.form-data";
const { execute, revalidate, redirect } = vi.hoisted(() => ({ execute: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("../../../composition/vehicles/vehicle.factory", () => ({ makeCreateVehicle: () => ({ execute }) }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
vi.mock("next/navigation", () => ({ redirect }));
function form() { const data = new FormData(); vehicleTextFields.forEach(field => data.set(field, "")); data.set("vehicleCode", "V-1"); return data; }
describe("createVehicleAction", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it("revalidates then redirects after successful creation without swallowing redirect", async () => {
    execute.mockResolvedValue({ success: true, vehicleId: 1 }); const navigation = new Error("redirect"); redirect.mockImplementation(() => { throw navigation; });
    await expect(createVehicleAction({}, form())).rejects.toBe(navigation);
    expect(revalidate).toHaveBeenCalledWith("/fleet/vehicles"); expect(redirect).toHaveBeenCalledWith("/fleet/vehicles");
    expect(revalidate.mock.invocationCallOrder[0]).toBeLessThan(redirect.mock.invocationCallOrder[0]);
  });
  it("preserves submitted values and typed business errors without navigating", async () => {
    execute.mockResolvedValue({ success: false, error: { type: "VIN_ALREADY_EXISTS" } });
    expect(await createVehicleAction({}, form())).toMatchObject({ error: { type: "VIN_ALREADY_EXISTS" }, values: { vehicleCode: "V-1" } }); expect(redirect).not.toHaveBeenCalled();
  });
  it("reports infrastructure failure separately without exposing raw details", async () => {
    execute.mockRejectedValue(new Error("private connection detail"));
    const result = await createVehicleAction({}, form()); expect(result.formError).toBe("unavailable"); expect(JSON.stringify(result)).not.toContain("private");
  });
  it("rejects invalid transport before invoking Application", async () => {
    expect(await createVehicleAction({}, new FormData())).toEqual({ formError: "invalid_form" }); expect(execute).not.toHaveBeenCalled();
  });
});
