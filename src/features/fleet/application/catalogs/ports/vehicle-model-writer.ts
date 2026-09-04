import type { NewVehicleModel, VehicleModel } from "../vehicle-model";

export interface VehicleModelWriter {
  create(input: NewVehicleModel): Promise<VehicleModel>;
}
