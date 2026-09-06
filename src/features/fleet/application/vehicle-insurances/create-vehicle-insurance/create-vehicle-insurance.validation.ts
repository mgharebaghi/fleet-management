import type { NewVehicleInsurance } from "../vehicle-insurance";
import type { InsuranceFieldErrors } from "./create-vehicle-insurance.contract";

const optionalText = (value: string | null) => value?.trim() || null;

export function normalizeCreateVehicleInsurance(input: NewVehicleInsurance): NewVehicleInsurance {
  return {
    vehicleId: input.vehicleId,
    insuranceType: input.insuranceType.trim(),
    insuranceCompany: optionalText(input.insuranceCompany),
    policyNo: optionalText(input.policyNo),
    startDate: input.startDate,
    expireDate: input.expireDate,
    premiumAmount: optionalText(input.premiumAmount),
    coverageAmount: optionalText(input.coverageAmount),
  };
}

export function validateCreateVehicleInsurance(input: NewVehicleInsurance): InsuranceFieldErrors {
  const errors: InsuranceFieldErrors = {};
  if (!Number.isInteger(input.vehicleId) || input.vehicleId <= 0 || input.vehicleId > 2147483647) errors.vehicleId = "INVALID_VEHICLE";
  if (!input.insuranceType) errors.insuranceType = "REQUIRED";
  else if (input.insuranceType.length > 100) errors.insuranceType = "TOO_LONG";
  if ((input.insuranceCompany?.length ?? 0) > 150) errors.insuranceCompany = "TOO_LONG";
  if ((input.policyNo?.length ?? 0) > 100) errors.policyNo = "TOO_LONG";

  for (const field of ["startDate", "expireDate"] as const) {
    const date = input[field];
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) errors[field] = "INVALID_DATE";
  }
  if (!errors.startDate && !errors.expireDate && input.expireDate.toISOString().slice(0, 10) < input.startDate.toISOString().slice(0, 10)) errors.expireDate = "DATE_ORDER";

  for (const field of ["premiumAmount", "coverageAmount"] as const) {
    const amount = input[field];
    if (amount !== null && (!/^\d+(\.\d{1,2})?$/.test(amount) || amount.split(".")[0].replace(/^0+/, "").length > 16)) errors[field] = "INVALID_DECIMAL";
  }
  return errors;
}
