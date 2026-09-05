import type { VehicleWriter } from "../ports/vehicle-writer";
import type { VehicleIdentifierReader, VehicleIdentifier } from "../ports/vehicle-identifier-reader";
import type { VehicleReferenceReader } from "../ports/vehicle-reference-reader";
import type { CreateVehicleInput, CreateVehicleResult, VehicleFailureType } from "./create-vehicle.contract";
import { normalizeCreateVehicle, validateCreateVehicle } from "./create-vehicle.validation";

const duplicateErrors: Record<VehicleIdentifier, VehicleFailureType> = {
  vehicleCode: "VEHICLE_CODE_ALREADY_EXISTS", internationalPlateNo: "INTERNATIONAL_PLATE_ALREADY_EXISTS",
  vin: "VIN_ALREADY_EXISTS", engineNo: "ENGINE_NO_ALREADY_EXISTS", chassisNo: "CHASSIS_NO_ALREADY_EXISTS",
};
export class CreateVehicle {
  constructor(private readonly writer: VehicleWriter, private readonly identifiers: VehicleIdentifierReader, private readonly references: VehicleReferenceReader, private readonly now: () => Date = () => new Date()) {}
  async execute(input: CreateVehicleInput): Promise<CreateVehicleResult> {
    const value = normalizeCreateVehicle(input);
    const fieldErrors = validateCreateVehicle(value, this.now());
    if (Object.keys(fieldErrors).length) return { success: false, error: { type: "VALIDATION_ERROR", fieldErrors } };
    if (await this.identifiers.identifierExists("vehicleCode", value.vehicleCode)) return { success: false, error: { type: "VEHICLE_CODE_ALREADY_EXISTS" } };
    if (await this.identifiers.internalPlateExists(value)) return { success: false, error: { type: "INTERNAL_PLATE_ALREADY_EXISTS" } };
    for (const field of ["internationalPlateNo", "vin", "engineNo", "chassisNo"] as const) {
      if (value[field] !== null && await this.identifiers.identifierExists(field, value[field])) return { success: false, error: { type: duplicateErrors[field] } };
    }
    if (!await this.references.modelExists(value.modelId)) return { success: false, error: { type: "MODEL_NOT_FOUND" } };
    if (!await this.references.statusExists(value.vehicleStatusId)) return { success: false, error: { type: "STATUS_NOT_FOUND" } };
    const created = await this.writer.create(value);
    return { success: true, vehicleId: created.vehicleId };
  }
}
