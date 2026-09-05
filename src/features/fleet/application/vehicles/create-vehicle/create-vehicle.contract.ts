import type { NewVehicle } from "../vehicle";
export type CreateVehicleInput = NewVehicle;
export type VehicleValidationCode = "REQUIRED" | "TOO_LONG" | "INVALID_PLATE" | "INVALID_YEAR" | "INVALID_REFERENCE" | "INVALID_DATE" | "FUTURE_DATE" | "INVALID_DECIMAL";
export type VehicleFieldErrors = Partial<Record<keyof NewVehicle, VehicleValidationCode>>;
export type VehicleFailureType = "VEHICLE_CODE_ALREADY_EXISTS" | "INTERNAL_PLATE_ALREADY_EXISTS" | "INTERNATIONAL_PLATE_ALREADY_EXISTS" | "VIN_ALREADY_EXISTS" | "ENGINE_NO_ALREADY_EXISTS" | "CHASSIS_NO_ALREADY_EXISTS" | "MODEL_NOT_FOUND" | "STATUS_NOT_FOUND";
export type CreateVehicleError = { type: "VALIDATION_ERROR"; fieldErrors: VehicleFieldErrors } | { type: VehicleFailureType };
export type CreateVehicleResult = { success: true; vehicleId: number } | { success: false; error: CreateVehicleError };
