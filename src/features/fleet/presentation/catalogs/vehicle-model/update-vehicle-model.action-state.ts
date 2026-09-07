import type { UpdateVehicleModelValidationErrorCode } from "../../../application/catalogs/update-vehicle-model/update-vehicle-model.contract";

export type UpdateVehicleModelActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | { status: "brand_required" }
  | { status: "vehicle_type_required" }
  | { status: "fuel_type_required" }
  | {
      status: "validation_error";
      fieldErrors: { name: UpdateVehicleModelValidationErrorCode[] };
    }
  | { status: "brand_not_found" }
  | { status: "vehicle_type_not_found" }
  | { status: "fuel_type_not_found" }
  | { status: "not_found" };

export const initialUpdateVehicleModelActionState: UpdateVehicleModelActionState =
  { status: "idle" };
