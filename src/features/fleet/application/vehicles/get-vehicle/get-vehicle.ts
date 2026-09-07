import type { VehicleDetail } from "../vehicle";
import type { VehicleReader } from "../ports/vehicle-reader";

export class GetVehicle {
  constructor(private readonly vehicleReader: VehicleReader) {}

  async execute(vehicleId: number): Promise<VehicleDetail | null> {
    return this.vehicleReader.findById(vehicleId);
  }
}
