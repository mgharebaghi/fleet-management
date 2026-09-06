import type { InsuranceVehicle } from "../vehicle-insurance";

export interface InsuranceVehicleReader {
  vehicleExists(vehicleId: number): Promise<boolean>;
  listVehicles(): Promise<InsuranceVehicle[]>;
}
