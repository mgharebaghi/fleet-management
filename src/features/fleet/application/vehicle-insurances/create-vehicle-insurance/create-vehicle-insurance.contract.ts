import type { NewVehicleInsurance } from "../vehicle-insurance";

export type CreateVehicleInsuranceInput = NewVehicleInsurance;
export type InsuranceValidationCode = "REQUIRED" | "TOO_LONG" | "INVALID_VEHICLE" | "INVALID_DATE" | "DATE_ORDER" | "INVALID_DECIMAL";
export type InsuranceFieldErrors = Partial<Record<keyof NewVehicleInsurance, InsuranceValidationCode>>;
export type CreateVehicleInsuranceError =
  | { type: "VALIDATION_ERROR"; fieldErrors: InsuranceFieldErrors }
  | { type: "VEHICLE_NOT_FOUND" };
export type CreateVehicleInsuranceResult =
  | { success: true; vehicleInsuranceId: string }
  | { success: false; error: CreateVehicleInsuranceError };
