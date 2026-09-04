import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreateVehicleModelResult } from "../../../../application/catalogs/create-vehicle-model/create-vehicle-model.contract";
import type { VehicleModel } from "../../../../application/catalogs/vehicle-model";
import { initialCreateVehicleModelActionState } from "../create-vehicle-model.action-state";
import { createVehicleModelAction } from "./create-vehicle-model.action";

const { executeCreateVehicleModel, makeCreateVehicleModel, revalidatePath } =
  vi.hoisted(() => ({
    executeCreateVehicleModel: vi.fn(),
    makeCreateVehicleModel: vi.fn(),
    revalidatePath: vi.fn(),
  }));

vi.mock("../../../../composition/catalogs/vehicle-model.factory", () => ({
  makeCreateVehicleModel,
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const createdVehicleModel: VehicleModel = {
  id: 21,
  name: "FH",
  isActive: true,
  brand: { id: 11, name: "Volvo" },
  vehicleType: { id: 12, name: "کامیون" },
  fuelType: { id: 13, name: "دیزل" },
};

function createFormData(
  values: Partial<Record<"name" | "brandId" | "vehicleTypeId" | "fuelTypeId", string>> = {},
): FormData {
  const formData = new FormData();
  formData.set("name", values.name ?? "FH");
  formData.set("brandId", values.brandId ?? "11");
  formData.set("vehicleTypeId", values.vehicleTypeId ?? "12");
  formData.set("fuelTypeId", values.fuelTypeId ?? "13");
  return formData;
}

describe("createVehicleModelAction", () => {
  beforeEach(() => {
    executeCreateVehicleModel.mockReset();
    makeCreateVehicleModel.mockReset().mockReturnValue({
      execute: executeCreateVehicleModel,
    });
    revalidatePath.mockReset();
  });

  it("passes parsed values to the use case and revalidates after success", async () => {
    executeCreateVehicleModel.mockResolvedValue({
      success: true,
      vehicleModel: createdVehicleModel,
    } satisfies CreateVehicleModelResult);

    const state = await createVehicleModelAction(
      initialCreateVehicleModelActionState,
      createFormData(),
    );

    expect(executeCreateVehicleModel).toHaveBeenCalledWith({
      name: "FH",
      brandId: 11,
      vehicleTypeId: 12,
      fuelTypeId: 13,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/fleet/catalogs");
    expect(state).toEqual({ status: "idle" });
  });

  it("returns brand_required without constructing the use case", async () => {
    const state = await createVehicleModelAction(
      initialCreateVehicleModelActionState,
      createFormData({ brandId: "" }),
    );

    expect(state).toEqual({ status: "brand_required" });
    expect(makeCreateVehicleModel).not.toHaveBeenCalled();
  });

  it("returns vehicle_type_required without constructing the use case", async () => {
    const state = await createVehicleModelAction(
      initialCreateVehicleModelActionState,
      createFormData({ vehicleTypeId: "" }),
    );

    expect(state).toEqual({ status: "vehicle_type_required" });
    expect(makeCreateVehicleModel).not.toHaveBeenCalled();
  });

  it("returns fuel_type_required without constructing the use case", async () => {
    const state = await createVehicleModelAction(
      initialCreateVehicleModelActionState,
      createFormData({ fuelTypeId: "" }),
    );

    expect(state).toEqual({ status: "fuel_type_required" });
    expect(makeCreateVehicleModel).not.toHaveBeenCalled();
  });

  it("returns invalid_form for malformed fields without constructing the use case", async () => {
    const formData = createFormData();
    formData.set("fuelTypeId", new Blob([]));

    const state = await createVehicleModelAction(
      initialCreateVehicleModelActionState,
      formData,
    );

    expect(state).toEqual({ status: "invalid_form" });
    expect(makeCreateVehicleModel).not.toHaveBeenCalled();
  });

  it.each([
    [
      { type: "VALIDATION_ERROR", fieldErrors: { name: ["REQUIRED"] } },
      { status: "validation_error", fieldErrors: { name: ["REQUIRED"] } },
    ],
    [{ type: "BRAND_NOT_FOUND" }, { status: "brand_not_found" }],
    [
      { type: "VEHICLE_TYPE_NOT_FOUND" },
      { status: "vehicle_type_not_found" },
    ],
    [{ type: "FUEL_TYPE_NOT_FOUND" }, { status: "fuel_type_not_found" }],
  ] as const)("maps the %s Application error", async (error, expectedState) => {
    executeCreateVehicleModel.mockResolvedValue({
      success: false,
      error,
    } as CreateVehicleModelResult);

    const state = await createVehicleModelAction(
      initialCreateVehicleModelActionState,
      createFormData(),
    );

    expect(state).toEqual(expectedState);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
