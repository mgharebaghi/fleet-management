import type { NewVehicleInsurance } from "../../../application/vehicle-insurances/vehicle-insurance";
import { normalizeVehicleNumerals } from "../../../application/vehicles/vehicle-text";

export const insuranceFormFields = ["vehicleId", "insuranceType", "insuranceCompany", "policyNo", "startDate", "expireDate", "premiumAmount", "coverageAmount"] as const;
export type InsuranceFormValues = Record<typeof insuranceFormFields[number], string>;

function parseDate(value: string): Date {
  const iso = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(NaN);
  const date = new Date(`${iso}T00:00:00.000Z`);
  // Date parsing must not silently roll a forged February 30 into March.
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? date : new Date(NaN);
}

export function parseInsuranceFormData(data: FormData):
  | { success: true; input: NewVehicleInsurance; values: InsuranceFormValues }
  | { success: false } {
  const values = {} as InsuranceFormValues;
  for (const field of insuranceFormFields) {
    const entries = data.getAll(field);
    if (entries.length !== 1 || typeof entries[0] !== "string") return { success: false };
    values[field] = entries[0];
  }
  const id = normalizeVehicleNumerals(values.vehicleId.trim());
  return {
    success: true, values,
    input: {
      vehicleId: /^\d+$/.test(id) ? Number(id) : NaN,
      insuranceType: values.insuranceType, insuranceCompany: values.insuranceCompany, policyNo: values.policyNo,
      startDate: parseDate(values.startDate), expireDate: parseDate(values.expireDate),
      premiumAmount: normalizeVehicleNumerals(values.premiumAmount.trim()),
      coverageAmount: normalizeVehicleNumerals(values.coverageAmount.trim()),
    },
  };
}
