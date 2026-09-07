import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
} from "../ports/catalog-entry-writer";
import type { VehicleModelWriter } from "../ports/vehicle-model-writer";
import type { DeleteVehicleModelResult } from "./delete-vehicle-model.contract";

export class DeleteVehicleModel {
  constructor(private readonly vehicleModelWriter: VehicleModelWriter) {}

  async execute(id: number): Promise<DeleteVehicleModelResult> {
    try {
      await this.vehicleModelWriter.remove(id);
      return { success: true };
    } catch (error) {
      if (error instanceof CatalogEntryInUseError) {
        return { success: false, error: { type: "IN_USE" } };
      }
      if (error instanceof CatalogEntryNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
