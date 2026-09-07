import {
  VehicleInUseError,
  VehicleNotFoundError,
  type VehicleWriter,
} from "../ports/vehicle-writer";
import type { DeleteVehicleResult } from "./delete-vehicle.contract";

export class DeleteVehicle {
  constructor(private readonly writer: VehicleWriter) {}

  async execute(vehicleId: number): Promise<DeleteVehicleResult> {
    try {
      await this.writer.remove(vehicleId);
      return { success: true };
    } catch (error) {
      if (error instanceof VehicleInUseError) {
        return { success: false, error: { type: "IN_USE" } };
      }
      if (error instanceof VehicleNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
