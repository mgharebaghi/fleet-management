import {
  VehicleInsuranceNotFoundError,
  type VehicleInsuranceWriter,
} from "../ports/vehicle-insurance-writer";
import type { DeleteVehicleInsuranceResult } from "./delete-vehicle-insurance.contract";

// VehicleInsurance is a leaf record: nothing in the schema references it, so
// there is no FK-in-use case to map here, only a since-deleted race.
export class DeleteVehicleInsurance {
  constructor(private readonly writer: VehicleInsuranceWriter) {}

  async execute(vehicleInsuranceId: string): Promise<DeleteVehicleInsuranceResult> {
    try {
      await this.writer.remove(vehicleInsuranceId);
      return { success: true };
    } catch (error) {
      if (error instanceof VehicleInsuranceNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
