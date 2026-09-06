import { beforeEach, describe, expect, it, vi } from "vitest";
import { createVehicleInsuranceAction } from "./create-vehicle-insurance.action";
import { insuranceFormFields } from "./create-vehicle-insurance.form-data";
const { execute, revalidate, redirect } = vi.hoisted(() => ({ execute: vi.fn(), revalidate: vi.fn(), redirect: vi.fn() }));
vi.mock("../../../composition/vehicle-insurances/vehicle-insurance.factory", () => ({ makeCreateVehicleInsurance: () => ({ execute }) }));
vi.mock("next/cache", () => ({ revalidatePath: revalidate }));
vi.mock("next/navigation", () => ({ redirect }));
function form() { const data = new FormData(); insuranceFormFields.forEach(field => data.set(field, "")); data.set("insuranceType", "Liability"); return data; }
describe("createVehicleInsuranceAction", () => {
  beforeEach(() => vi.resetAllMocks());
  it("revalidates before redirect and does not swallow navigation", async () => {
    execute.mockResolvedValue({ success: true, vehicleInsuranceId: "1" }); const navigation = new Error("redirect"); redirect.mockImplementation(() => { throw navigation; });
    await expect(createVehicleInsuranceAction({}, form())).rejects.toBe(navigation);
    expect(revalidate).toHaveBeenCalledWith("/fleet/vehicle-insurances"); expect(redirect).toHaveBeenCalledWith("/fleet/vehicle-insurances");
    expect(revalidate.mock.invocationCallOrder[0]).toBeLessThan(redirect.mock.invocationCallOrder[0]);
  });
  it("preserves submitted values and business errors", async () => {
    execute.mockResolvedValue({ success: false, error: { type: "VEHICLE_NOT_FOUND" } });
    expect(await createVehicleInsuranceAction({}, form())).toMatchObject({ error: { type: "VEHICLE_NOT_FOUND" }, values: { insuranceType: "Liability" } });
    expect(redirect).not.toHaveBeenCalled();
  });
  it("hides infrastructure details", async () => {
    execute.mockRejectedValue(new Error("private credentials"));
    const result = await createVehicleInsuranceAction({}, form()); expect(result.formError).toBe("unavailable"); expect(JSON.stringify(result)).not.toContain("private");
  });
  it("rejects malformed transport before invoking the use case", async () => {
    expect(await createVehicleInsuranceAction({}, new FormData())).toEqual({ formError: "invalid_form" }); expect(execute).not.toHaveBeenCalled();
  });
});
