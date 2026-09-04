import type { VehicleModelReader } from "../ports/vehicle-model-reader";
import type { VehicleModel } from "../vehicle-model";

export class ListVehicleModels {
  constructor(private readonly vehicleModelReader: VehicleModelReader) {}

  async execute(): Promise<VehicleModel[]> {
    return this.vehicleModelReader.list();
  }
}
