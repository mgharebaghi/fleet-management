import type { VehicleModelReferenceReader } from "../ports/vehicle-model-reference-reader";
import type { VehicleModelWriter } from "../ports/vehicle-model-writer";
import type {
  CreateVehicleModelInput,
  CreateVehicleModelResult,
} from "./create-vehicle-model.contract";
import {
  normalizeCreateVehicleModelInput,
  validateCreateVehicleModelInput,
} from "./create-vehicle-model.validation";

export class CreateVehicleModel {
  constructor(
    private readonly vehicleModelWriter: VehicleModelWriter,
    private readonly referenceReader: VehicleModelReferenceReader,
  ) {}

  async execute(
    input: CreateVehicleModelInput,
  ): Promise<CreateVehicleModelResult> {
    const normalizedInput = normalizeCreateVehicleModelInput(input);
    const validationError = validateCreateVehicleModelInput(normalizedInput);

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

    const vehicleModel = await this.vehicleModelWriter.create(normalizedInput);

    return { success: true, vehicleModel };
  }
}
