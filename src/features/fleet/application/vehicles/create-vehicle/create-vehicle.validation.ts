import type { NewVehicle } from "../vehicle";
import { normalizeVehicleNumerals } from "../vehicle-text";
import type { VehicleFieldErrors } from "./create-vehicle.contract";

const optionalString = (value: string | null) => value?.trim() || null;
export function normalizeCreateVehicle(input: NewVehicle): NewVehicle {
  return {
    vehicleCode: input.vehicleCode.trim(),
    plateNoLeftSide: normalizeVehicleNumerals(input.plateNoLeftSide.trim()),
    plateNoCenterChar: input.plateNoCenterChar.trim(),
    plateNoRightSide: normalizeVehicleNumerals(input.plateNoRightSide.trim()),
    plateNoIranNo: normalizeVehicleNumerals(input.plateNoIranNo.trim()),
    internationalPlateNo: optionalString(input.internationalPlateNo),
    vin: optionalString(input.vin), engineNo: optionalString(input.engineNo), chassisNo: optionalString(input.chassisNo),
    modelId: input.modelId, vehicleStatusId: input.vehicleStatusId,
    modelYear: input.modelYear, purchaseDate: input.purchaseDate,
    purchasePrice: optionalString(input.purchasePrice),
    currentOdometer: optionalString(input.currentOdometer),
    currentEngineHour: optionalString(input.currentEngineHour),
  };
}

export function validateCreateVehicle(input: NewVehicle, today: Date): VehicleFieldErrors {
  const errors: VehicleFieldErrors = {};
  for (const field of ["vehicleCode", "plateNoCenterChar"] as const) {
    if (!input[field]) errors[field] = "REQUIRED";
    else if (input[field].length > (field === "vehicleCode" ? 50 : 3)) errors[field] = "TOO_LONG";
  }
  for (const field of ["plateNoLeftSide", "plateNoRightSide", "plateNoIranNo"] as const) {
    const length = field === "plateNoRightSide" ? 3 : 2;
    if (!input[field]) errors[field] = "REQUIRED";
    else if (!new RegExp(`^[0-9]{${length}}$`).test(input[field])) errors[field] = "INVALID_PLATE";
  }
  for (const field of ["internationalPlateNo", "vin", "engineNo", "chassisNo"] as const) {
    if ((input[field]?.length ?? 0) > (field === "internationalPlateNo" ? 10 : 50)) errors[field] = "TOO_LONG";
  }
  for (const field of ["modelId", "vehicleStatusId"] as const) {
    if (!Number.isInteger(input[field]) || input[field] <= 0 || input[field] > 2147483647) errors[field] = "INVALID_REFERENCE";
  }
  if (input.modelYear !== null && (!Number.isInteger(input.modelYear) || input.modelYear <= 0 || input.modelYear > 32767)) errors.modelYear = "INVALID_YEAR";
  for (const field of ["purchasePrice", "currentOdometer", "currentEngineHour"] as const) {
    const value = input[field];
    // SQL decimal(18,2): at most sixteen significant integer digits; never round input.
    if (value !== null && (!/^\d+(\.\d{1,2})?$/.test(value) || value.split(".")[0].replace(/^0+/, "").length > 16)) errors[field] = "INVALID_DECIMAL";
  }
  if (input.purchaseDate !== null) {
    const date = input.purchaseDate;
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) errors.purchaseDate = "INVALID_DATE";
    else if (date.toISOString().slice(0, 10) > today.toISOString().slice(0, 10)) errors.purchaseDate = "FUTURE_DATE";
  }
  return errors;
}
