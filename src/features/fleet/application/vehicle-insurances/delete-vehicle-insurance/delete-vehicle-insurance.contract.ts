export type DeleteVehicleInsuranceError = { type: "NOT_FOUND" };

export type DeleteVehicleInsuranceResult =
  | { success: true }
  | { success: false; error: DeleteVehicleInsuranceError };
