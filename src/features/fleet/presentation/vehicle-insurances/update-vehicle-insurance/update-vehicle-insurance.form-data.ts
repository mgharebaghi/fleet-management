import type { UpdateVehicleInsuranceInput } from "../../../application/vehicle-insurances/update-vehicle-insurance/update-vehicle-insurance.contract";
import { normalizeVehicleNumerals } from "../../../application/vehicles/vehicle-text";
import {
  insuranceFormFields,
  type InsuranceFormValues,
} from "../create-vehicle-insurance/create-vehicle-insurance.form-data";

function parseDate(value: string): Date {
  const iso = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return new Date(NaN);
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? date : new Date(NaN);
}

export function parseUpdateInsuranceFormData(
  data: FormData,
):
  | { success: true; input: UpdateVehicleInsuranceInput; values: InsuranceFormValues }
  | { success: false } {
  const idValue = data.get("vehicleInsuranceId");
  if (typeof idValue !== "string" || !/^\d+$/.test(idValue)) {
    return { success: false };
  }

  const values = {} as InsuranceFormValues;
  for (const field of insuranceFormFields) {
    const entries = data.getAll(field);
    if (entries.length !== 1 || typeof entries[0] !== "string") return { success: false };
    values[field] = entries[0];
  }

  const id = normalizeVehicleNumerals(values.vehicleId.trim());
  return {
    success: true,
    values,
    input: {
      vehicleInsuranceId: idValue,
      vehicleId: /^\d+$/.test(id) ? Number(id) : NaN,
      insuranceType: values.insuranceType,
      insuranceCompany: values.insuranceCompany,
      policyNo: values.policyNo,
      startDate: parseDate(values.startDate),
      expireDate: parseDate(values.expireDate),
      premiumAmount: normalizeVehicleNumerals(values.premiumAmount.trim()),
      coverageAmount: normalizeVehicleNumerals(values.coverageAmount.trim()),
      isActive: data.get("isActive") === "on",
    },
  };
}
