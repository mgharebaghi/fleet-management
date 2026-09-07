import type { UpdateVehicleInput } from "../../../application/vehicles/update-vehicle/update-vehicle.contract";
import { normalizeVehicleNumerals } from "../../../application/vehicles/vehicle-text";
import {
  vehicleTextFields,
  type VehicleFormValues,
} from "../create-vehicle/create-vehicle.form-data";

export function parseUpdateVehicleFormData(
  data: FormData,
): { success: true; input: UpdateVehicleInput; values: VehicleFormValues } | { success: false } {
  const vehicleIdValue = data.get("vehicleId");
  if (typeof vehicleIdValue !== "string") return { success: false };
  const vehicleId = Number(vehicleIdValue);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) return { success: false };

  const values = {} as VehicleFormValues;
  for (const field of vehicleTextFields) {
    const value = data.get(field);
    if (typeof value !== "string") return { success: false };
    values[field] = value;
  }

  const numeric = (value: string) => normalizeVehicleNumerals(value.trim());
  const integer = (value: string) =>
    /^\d+$/.test(numeric(value)) ? Number(numeric(value)) : NaN;

  let purchaseDate: Date | null = null;
  if (values.purchaseDate.trim()) {
    const iso = values.purchaseDate.trim();
    purchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(iso)
      ? new Date(`${iso}T00:00:00.000Z`)
      : new Date(NaN);
  }

  return {
    success: true,
    values,
    input: {
      vehicleId,
      vehicleCode: values.vehicleCode,
      plateNoLeftSide: values.plateNoLeftSide,
      plateNoCenterChar: values.plateNoCenterChar,
      plateNoRightSide: values.plateNoRightSide,
      plateNoIranNo: values.plateNoIranNo,
      internationalPlateNo: values.internationalPlateNo,
      vin: values.vin,
      engineNo: values.engineNo,
      chassisNo: values.chassisNo,
      modelId: integer(values.modelId),
      vehicleStatusId: integer(values.vehicleStatusId),
      modelYear: values.modelYear.trim() ? integer(values.modelYear) : null,
      purchaseDate,
      purchasePrice: numeric(values.purchasePrice),
      currentOdometer: numeric(values.currentOdometer),
      currentEngineHour: numeric(values.currentEngineHour),
    },
  };
}
