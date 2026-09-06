import type { NewVehicleInsurance } from "../vehicle-insurance";

// A reference can disappear between the existence check and the write.
export class InsuranceVehicleNotFoundError extends Error {
  constructor() {
    super("The insurance vehicle no longer exists.");
    this.name = "InsuranceVehicleNotFoundError";
  }
}

export interface VehicleInsuranceWriter {
  create(input: NewVehicleInsurance): Promise<{ vehicleInsuranceId: string }>;
}
