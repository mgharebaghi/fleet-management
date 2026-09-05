import type { CreateVehicleError } from "../../../application/vehicles/create-vehicle/create-vehicle.contract";
import type { VehicleFormValues } from "./create-vehicle.form-data";
export type CreateVehicleActionState = { error?: CreateVehicleError; formError?: "invalid_form" | "unavailable"; values?: VehicleFormValues };
