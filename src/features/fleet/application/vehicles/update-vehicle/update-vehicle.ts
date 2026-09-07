import {
  normalizeCreateVehicle,
  validateCreateVehicle,
} from "../create-vehicle/create-vehicle.validation";
import type { VehicleFailureType } from "../create-vehicle/create-vehicle.contract";
import type { VehicleIdentifier, VehicleIdentifierReader } from "../ports/vehicle-identifier-reader";
import type { VehicleReferenceReader } from "../ports/vehicle-reference-reader";
import { VehicleNotFoundError, type VehicleWriter } from "../ports/vehicle-writer";
import type { UpdateVehicleInput, UpdateVehicleResult } from "./update-vehicle.contract";

const duplicateErrors: Record<VehicleIdentifier, VehicleFailureType> = {
  vehicleCode: "VEHICLE_CODE_ALREADY_EXISTS",
  internationalPlateNo: "INTERNATIONAL_PLATE_ALREADY_EXISTS",
  vin: "VIN_ALREADY_EXISTS",
  engineNo: "ENGINE_NO_ALREADY_EXISTS",
  chassisNo: "CHASSIS_NO_ALREADY_EXISTS",
};

export class UpdateVehicle {
  constructor(
    private readonly writer: VehicleWriter,
    private readonly identifiers: VehicleIdentifierReader,
    private readonly references: VehicleReferenceReader,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: UpdateVehicleInput): Promise<UpdateVehicleResult> {
    const { vehicleId, ...rest } = input;
    const value = normalizeCreateVehicle(rest);
    const fieldErrors = validateCreateVehicle(value, this.now());
    if (Object.keys(fieldErrors).length) {
      return { success: false, error: { type: "VALIDATION_ERROR", fieldErrors } };
    }

    if (
      await this.identifiers.identifierExists(
        "vehicleCode",
        value.vehicleCode,
        vehicleId,
      )
    ) {
      return { success: false, error: { type: "VEHICLE_CODE_ALREADY_EXISTS" } };
    }
    if (await this.identifiers.internalPlateExists(value, vehicleId)) {
      return { success: false, error: { type: "INTERNAL_PLATE_ALREADY_EXISTS" } };
    }
    for (const field of [
      "internationalPlateNo",
      "vin",
      "engineNo",
      "chassisNo",
    ] as const) {
      if (
        value[field] !== null &&
        (await this.identifiers.identifierExists(field, value[field], vehicleId))
      ) {
        return { success: false, error: { type: duplicateErrors[field] } };
      }
    }
    if (!(await this.references.modelExists(value.modelId))) {
      return { success: false, error: { type: "MODEL_NOT_FOUND" } };
    }
    if (!(await this.references.statusExists(value.vehicleStatusId))) {
      return { success: false, error: { type: "STATUS_NOT_FOUND" } };
    }

    try {
      await this.writer.update(vehicleId, value);
      return { success: true };
    } catch (error) {
      if (error instanceof VehicleNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
