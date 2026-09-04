import type { VehicleModel } from "../vehicle-model";

export interface VehicleModelReader {
  list(): Promise<VehicleModel[]>;
}
