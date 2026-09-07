export type ParseDeleteVehicleInsuranceFormDataResult =
  | { success: true; vehicleInsuranceId: string }
  | { success: false };

export function parseDeleteVehicleInsuranceFormData(
  formData: FormData,
): ParseDeleteVehicleInsuranceFormDataResult {
  const value = formData.get("vehicleInsuranceId");

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return { success: false };
  }

  return { success: true, vehicleInsuranceId: value };
}
