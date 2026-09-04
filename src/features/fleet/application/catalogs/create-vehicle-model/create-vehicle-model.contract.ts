import type { VehicleModel } from "../vehicle-model";

export type CreateVehicleModelInput = {
  name: string;
  brandId: number;
  vehicleTypeId: number;
  fuelTypeId: number;
};

export type CreateVehicleModelValidationErrorCode = "REQUIRED" | "TOO_LONG";

export type CreateVehicleModelValidationError = {
  type: "VALIDATION_ERROR";
  fieldErrors: {
    name: CreateVehicleModelValidationErrorCode[];
  };
};

export type CreateVehicleModelError =
  | CreateVehicleModelValidationError
  | { type: "BRAND_NOT_FOUND" }
  | { type: "VEHICLE_TYPE_NOT_FOUND" }
  | { type: "FUEL_TYPE_NOT_FOUND" };

export type CreateVehicleModelResult =
  | { success: true; vehicleModel: VehicleModel }
  | { success: false; error: CreateVehicleModelError };
