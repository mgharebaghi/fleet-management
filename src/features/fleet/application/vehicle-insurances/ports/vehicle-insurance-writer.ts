import type { NewVehicleInsurance } from "../vehicle-insurance";

// A reference can disappear between the existence check and the write.
export class InsuranceVehicleNotFoundError extends Error {
  constructor() {
    super("The insurance vehicle no longer exists.");
    this.name = "InsuranceVehicleNotFoundError";
  }
}

// A record can disappear between a check and the write that follows it.
export class VehicleInsuranceNotFoundError extends Error {
  constructor() {
    super("The vehicle insurance record no longer exists.");
    this.name = "VehicleInsuranceNotFoundError";
  }
}

export type UpdateVehicleInsuranceChanges = NewVehicleInsurance & {
  isActive: boolean;
};

export interface VehicleInsuranceWriter {
  create(input: NewVehicleInsurance): Promise<{ vehicleInsuranceId: string }>;
  update(
    vehicleInsuranceId: string,
    changes: UpdateVehicleInsuranceChanges,
  ): Promise<void>;
  remove(vehicleInsuranceId: string): Promise<void>;
}
