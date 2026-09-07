import type { NewVehicleInsurance } from "../vehicle-insurance";
import type { InsuranceFieldErrors } from "../create-vehicle-insurance/create-vehicle-insurance.contract";

export type UpdateVehicleInsuranceInput = NewVehicleInsurance & {
  vehicleInsuranceId: string;
  isActive: boolean;
};

export type UpdateVehicleInsuranceError =
  | { type: "VALIDATION_ERROR"; fieldErrors: InsuranceFieldErrors }
  | { type: "VEHICLE_NOT_FOUND" }
  | { type: "NOT_FOUND" };

export type UpdateVehicleInsuranceResult =
  | { success: true }
  | { success: false; error: UpdateVehicleInsuranceError };
