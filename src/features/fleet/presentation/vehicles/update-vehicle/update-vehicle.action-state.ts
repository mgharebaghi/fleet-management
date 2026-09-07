import type { CreateVehicleError } from "../../../application/vehicles/create-vehicle/create-vehicle.contract";
import type { VehicleFormValues } from "../create-vehicle/create-vehicle.form-data";

export type UpdateVehicleActionState = {
  error?: CreateVehicleError;
  formError?: "invalid_form" | "unavailable" | "not_found";
  values?: VehicleFormValues;
};
