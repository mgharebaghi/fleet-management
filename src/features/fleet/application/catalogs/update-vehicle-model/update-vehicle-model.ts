import { CatalogEntryNotFoundError } from "../ports/catalog-entry-writer";
import type { VehicleModelReferenceReader } from "../ports/vehicle-model-reference-reader";
import type { VehicleModelWriter } from "../ports/vehicle-model-writer";
import type {
  UpdateVehicleModelInput,
  UpdateVehicleModelResult,
} from "./update-vehicle-model.contract";
import {
  normalizeUpdateVehicleModelInput,
  validateUpdateVehicleModelInput,
} from "./update-vehicle-model.validation";

export class UpdateVehicleModel {
  constructor(
    private readonly vehicleModelWriter: VehicleModelWriter,
    private readonly referenceReader: VehicleModelReferenceReader,
  ) {}

  async execute(
    input: UpdateVehicleModelInput,
  ): Promise<UpdateVehicleModelResult> {
    const normalizedInput = normalizeUpdateVehicleModelInput(input);
    const validationError = validateUpdateVehicleModelInput(normalizedInput);

    if (validationError !== null) {
      return { success: false, error: validationError };
    }

    if (!(await this.referenceReader.brandExists(normalizedInput.brandId))) {
      return { success: false, error: { type: "BRAND_NOT_FOUND" } };
    }

    if (
      !(await this.referenceReader.vehicleTypeExists(
        normalizedInput.vehicleTypeId,
      ))
    ) {
      return { success: false, error: { type: "VEHICLE_TYPE_NOT_FOUND" } };
    }

    if (
      !(await this.referenceReader.fuelTypeExists(normalizedInput.fuelTypeId))
    ) {
      return { success: false, error: { type: "FUEL_TYPE_NOT_FOUND" } };
    }

    try {
      const vehicleModel = await this.vehicleModelWriter.update(
        normalizedInput.id,
        {
          name: normalizedInput.name,
          brandId: normalizedInput.brandId,
          vehicleTypeId: normalizedInput.vehicleTypeId,
          fuelTypeId: normalizedInput.fuelTypeId,
          isActive: normalizedInput.isActive,
        },
      );

      return { success: true, vehicleModel };
    } catch (error) {
      if (error instanceof CatalogEntryNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
