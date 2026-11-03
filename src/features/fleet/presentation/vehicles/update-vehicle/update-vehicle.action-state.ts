import type { CreateVehicleError } from "../../../application/vehicles/create-vehicle/create-vehicle.contract";
import type { VehicleFormValues } from "../components/vehicle-form-data";

export type UpdateVehicleActionState = {
  error?: CreateVehicleError | { type: "METER_HISTORY_LOCKED" };
  formError?: "invalid_form" | "unavailable" | "not_found";
  values?: VehicleFormValues;
};
