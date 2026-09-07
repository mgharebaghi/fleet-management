export type ParseDeleteVehicleFormDataResult =
  | { success: true; vehicleId: number }
  | { success: false };

export function parseDeleteVehicleFormData(
  formData: FormData,
): ParseDeleteVehicleFormDataResult {
  const vehicleIdValue = formData.get("vehicleId");

  if (typeof vehicleIdValue !== "string") {
    return { success: false };
  }

  const vehicleId = Number(vehicleIdValue);
  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return { success: false };
  }

  return { success: true, vehicleId };
}
