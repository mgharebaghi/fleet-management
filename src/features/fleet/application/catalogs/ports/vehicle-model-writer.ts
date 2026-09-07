import type { NewVehicleModel, VehicleModel } from "../vehicle-model";

export type UpdateVehicleModelChanges = {
  name: string;
  brandId: number;
  vehicleTypeId: number;
  fuelTypeId: number;
  isActive: boolean;
};

export interface VehicleModelWriter {
  create(input: NewVehicleModel): Promise<VehicleModel>;
  update(id: number, changes: UpdateVehicleModelChanges): Promise<VehicleModel>;
  remove(id: number): Promise<void>;
}
