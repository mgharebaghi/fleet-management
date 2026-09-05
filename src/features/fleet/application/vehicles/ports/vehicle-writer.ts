import type { NewVehicle } from "../vehicle";
export interface VehicleWriter {
  create(input: NewVehicle): Promise<{ vehicleId: number }>;
}
