import type { NewVehicle } from "../../../application/vehicles/vehicle";
import { normalizeVehicleNumerals } from "../../../application/vehicles/vehicle-text";

export const vehicleTextFields = ["vehicleCode", "plateNoLeftSide", "plateNoCenterChar", "plateNoRightSide", "plateNoIranNo", "internationalPlateNo", "vin", "engineNo", "chassisNo", "modelId", "vehicleStatusId", "modelYear", "purchaseDate", "purchasePrice", "currentOdometer", "currentEngineHour"] as const;
export type VehicleFormValues = Record<typeof vehicleTextFields[number], string>;
export function parseVehicleFormData(data: FormData): { success: true; input: NewVehicle; values: VehicleFormValues } | { success: false } {
  const values = {} as VehicleFormValues;
  for (const field of vehicleTextFields) {
    const value = data.get(field);
    if (typeof value !== "string") return { success: false };
    values[field] = value;
  }
  const numeric = (value: string) => normalizeVehicleNumerals(value.trim());
  const integer = (value: string) => /^\d+$/.test(numeric(value)) ? Number(numeric(value)) : NaN;
  // The date picker already converted the Jalali selection to a Gregorian
  // yyyy-mm-dd, so this boundary only has to parse it.
  let purchaseDate: Date | null = null;
  if (values.purchaseDate.trim()) {
    const iso = values.purchaseDate.trim();
    purchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00.000Z`) : new Date(NaN);
  }
  return { success: true, values, input: {
    vehicleCode: values.vehicleCode, plateNoLeftSide: values.plateNoLeftSide,
    plateNoCenterChar: values.plateNoCenterChar, plateNoRightSide: values.plateNoRightSide, plateNoIranNo: values.plateNoIranNo,
    internationalPlateNo: values.internationalPlateNo, vin: values.vin, engineNo: values.engineNo, chassisNo: values.chassisNo,
    modelId: integer(values.modelId), vehicleStatusId: integer(values.vehicleStatusId),
    modelYear: values.modelYear.trim() ? integer(values.modelYear) : null, purchaseDate,
    purchasePrice: numeric(values.purchasePrice), currentOdometer: numeric(values.currentOdometer), currentEngineHour: numeric(values.currentEngineHour),
  } };
}
