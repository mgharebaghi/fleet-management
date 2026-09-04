import type { CreateVehicleModelInput } from "../../../application/catalogs/create-vehicle-model/create-vehicle-model.contract";

export type ParseCreateVehicleModelFormDataResult =
  | { success: true; input: CreateVehicleModelInput }
  | {
      success: false;
      reason:
        | "brand_required"
        | "vehicle_type_required"
        | "fuel_type_required"
        | "invalid_form";
    };

function parseReferenceId(value: FormDataEntryValue): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export function parseCreateVehicleModelFormData(
  formData: FormData,
): ParseCreateVehicleModelFormDataResult {
  const name = formData.get("name");
  const brandValue = formData.get("brandId");
  const vehicleTypeValue = formData.get("vehicleTypeId");
  const fuelTypeValue = formData.get("fuelTypeId");

  if (
    typeof name !== "string" ||
    brandValue === null ||
    vehicleTypeValue === null ||
    fuelTypeValue === null
  ) {
    return { success: false, reason: "invalid_form" };
  }

  if (brandValue === "") {
    return { success: false, reason: "brand_required" };
  }

  if (vehicleTypeValue === "") {
    return { success: false, reason: "vehicle_type_required" };
  }

  if (fuelTypeValue === "") {
    return { success: false, reason: "fuel_type_required" };
  }

  const brandId = parseReferenceId(brandValue);
  const vehicleTypeId = parseReferenceId(vehicleTypeValue);
  const fuelTypeId = parseReferenceId(fuelTypeValue);

  if (brandId === null || vehicleTypeId === null || fuelTypeId === null) {
    return { success: false, reason: "invalid_form" };
  }

  return {
    success: true,
    input: { name, brandId, vehicleTypeId, fuelTypeId },
  };
}
