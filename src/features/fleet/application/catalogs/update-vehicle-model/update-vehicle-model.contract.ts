import type { VehicleModel } from "../vehicle-model";

export type UpdateVehicleModelInput = {
  id: number;
  name: string;
  brandId: number;
  vehicleTypeId: number;
  fuelTypeId: number;
  isActive: boolean;
};

export type UpdateVehicleModelValidationErrorCode = "REQUIRED" | "TOO_LONG";

export type UpdateVehicleModelValidationError = {
  type: "VALIDATION_ERROR";
  fieldErrors: {
    name: UpdateVehicleModelValidationErrorCode[];
  };
};

export type UpdateVehicleModelError =
  | UpdateVehicleModelValidationError
  | { type: "BRAND_NOT_FOUND" }
  | { type: "VEHICLE_TYPE_NOT_FOUND" }
  | { type: "FUEL_TYPE_NOT_FOUND" }
  | { type: "NOT_FOUND" };

export type UpdateVehicleModelResult =
  | { success: true; vehicleModel: VehicleModel }
  | { success: false; error: UpdateVehicleModelError };
