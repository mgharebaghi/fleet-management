import { describe, expect, it } from "vitest";

import { parseCreateVehicleModelFormData } from "./create-vehicle-model.form-data";

function createFormData(values: {
  name?: string | Blob;
  brandId?: string | Blob;
  vehicleTypeId?: string | Blob;
  fuelTypeId?: string | Blob;
}): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      formData.set(key, value);
    }
  }

  return formData;
}

describe("parseCreateVehicleModelFormData", () => {
  it("reads the model name and selected reference IDs", () => {
    const result = parseCreateVehicleModelFormData(
      createFormData({
        name: "FH",
        brandId: "11",
        vehicleTypeId: "12",
        fuelTypeId: "13",
      }),
    );

    expect(result).toEqual({
      success: true,
      input: {
        name: "FH",
        brandId: 11,
        vehicleTypeId: 12,
        fuelTypeId: 13,
      },
    });
  });

  it("reports a missing brand selection separately", () => {
    const result = parseCreateVehicleModelFormData(
      createFormData({
        name: "FH",
        brandId: "",
        vehicleTypeId: "12",
        fuelTypeId: "13",
      }),
    );

    expect(result).toEqual({ success: false, reason: "brand_required" });
  });

  it("reports a missing vehicle type selection separately", () => {
    const result = parseCreateVehicleModelFormData(
      createFormData({
        name: "FH",
        brandId: "11",
        vehicleTypeId: "",
        fuelTypeId: "13",
      }),
    );

    expect(result).toEqual({
      success: false,
      reason: "vehicle_type_required",
    });
  });

  it("reports a missing fuel type selection separately", () => {
    const result = parseCreateVehicleModelFormData(
      createFormData({
        name: "FH",
        brandId: "11",
        vehicleTypeId: "12",
        fuelTypeId: "",
      }),
    );

    expect(result).toEqual({ success: false, reason: "fuel_type_required" });
  });

  it.each([
    createFormData({ brandId: "1", vehicleTypeId: "1", fuelTypeId: "1" }),
    createFormData({ name: "FH", vehicleTypeId: "1", fuelTypeId: "1" }),
    createFormData({ name: "FH", brandId: "1", fuelTypeId: "1" }),
    createFormData({ name: "FH", brandId: "1", vehicleTypeId: "1" }),
    createFormData({
      name: "FH",
      brandId: "not-an-id",
      vehicleTypeId: "1",
      fuelTypeId: "1",
    }),
    createFormData({
      name: "FH",
      brandId: "1",
      vehicleTypeId: "0",
      fuelTypeId: "1",
    }),
    createFormData({
      name: "FH",
      brandId: "1",
      vehicleTypeId: "1",
      fuelTypeId: new Blob([]),
    }),
  ])("rejects malformed form values", (formData) => {
    expect(parseCreateVehicleModelFormData(formData)).toEqual({
      success: false,
      reason: "invalid_form",
    });
  });
});
