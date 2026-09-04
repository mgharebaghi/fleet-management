import type { CreateVehicleModelValidationErrorCode } from "../../../application/catalogs/create-vehicle-model/create-vehicle-model.contract";

export type CreateVehicleModelActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | { status: "brand_required" }
  | { status: "vehicle_type_required" }
  | { status: "fuel_type_required" }
  | {
      status: "validation_error";
      fieldErrors: { name: CreateVehicleModelValidationErrorCode[] };
    }
  | { status: "brand_not_found" }
  | { status: "vehicle_type_not_found" }
  | { status: "fuel_type_not_found" };

export const initialCreateVehicleModelActionState: CreateVehicleModelActionState =
  { status: "idle" };
