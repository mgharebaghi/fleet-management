import type { NewVehicle } from "../vehicle";

// A record can disappear or change between a check and the write that follows it.
export class VehicleNotFoundError extends Error {
  constructor() {
    super("The vehicle no longer exists.");
    this.name = "VehicleNotFoundError";
  }
}

// Raised when a delete is rejected by a foreign key: an assignment,
// insurance, or meter-reading record still references this vehicle.
export class VehicleInUseError extends Error {
  constructor() {
    super("The vehicle is referenced by other records.");
    this.name = "VehicleInUseError";
  }
}

export interface VehicleWriter {
  create(input: NewVehicle): Promise<{ vehicleId: number }>;
  update(vehicleId: number, input: NewVehicle): Promise<void>;
  remove(vehicleId: number): Promise<void>;
}
