import type { NewVehicle } from "../vehicle";
import type { VehicleFieldErrors, VehicleFailureType } from "../create-vehicle/create-vehicle.contract";

export type UpdateVehicleInput = NewVehicle & { vehicleId: number };

export type UpdateVehicleError =
  | { type: "VALIDATION_ERROR"; fieldErrors: VehicleFieldErrors }
  | { type: VehicleFailureType }
  | { type: "NOT_FOUND" };

export type UpdateVehicleResult =
  | { success: true }
  | { success: false; error: UpdateVehicleError };
