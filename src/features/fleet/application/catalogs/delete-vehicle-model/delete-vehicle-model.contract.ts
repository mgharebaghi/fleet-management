export type DeleteVehicleModelError = { type: "NOT_FOUND" } | { type: "IN_USE" };

export type DeleteVehicleModelResult =
  | { success: true }
  | { success: false; error: DeleteVehicleModelError };
