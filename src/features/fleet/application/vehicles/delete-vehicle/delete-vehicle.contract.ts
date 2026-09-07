export type DeleteVehicleError = { type: "NOT_FOUND" } | { type: "IN_USE" };

export type DeleteVehicleResult =
  | { success: true }
  | { success: false; error: DeleteVehicleError };
