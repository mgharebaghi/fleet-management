import type { UpdateVehicleModelInput } from "../../../application/catalogs/update-vehicle-model/update-vehicle-model.contract";

export type ParseUpdateVehicleModelFormDataResult =
  | { success: true; input: UpdateVehicleModelInput }
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

export function parseUpdateVehicleModelFormData(
  formData: FormData,
): ParseUpdateVehicleModelFormDataResult {
  const idValue = formData.get("id");
  const name = formData.get("name");
  const brandValue = formData.get("brandId");
  const vehicleTypeValue = formData.get("vehicleTypeId");
  const fuelTypeValue = formData.get("fuelTypeId");

  if (
    typeof idValue !== "string" ||
    typeof name !== "string" ||
    brandValue === null ||
    vehicleTypeValue === null ||
    fuelTypeValue === null
  ) {
    return { success: false, reason: "invalid_form" };
  }

  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) {
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

  const isActive = formData.get("isActive") === "on";

  return {
    success: true,
    input: { id, name, brandId, vehicleTypeId, fuelTypeId, isActive },
  };
}
