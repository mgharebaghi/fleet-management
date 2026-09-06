import type { InsuranceVehicleReader } from "../ports/insurance-vehicle-reader";
import { InsuranceVehicleNotFoundError, type VehicleInsuranceWriter } from "../ports/vehicle-insurance-writer";
import type { CreateVehicleInsuranceInput, CreateVehicleInsuranceResult } from "./create-vehicle-insurance.contract";
import { normalizeCreateVehicleInsurance, validateCreateVehicleInsurance } from "./create-vehicle-insurance.validation";

export class CreateVehicleInsurance {
  constructor(private readonly writer: VehicleInsuranceWriter, private readonly vehicles: InsuranceVehicleReader) {}

  async execute(input: CreateVehicleInsuranceInput): Promise<CreateVehicleInsuranceResult> {
    const value = normalizeCreateVehicleInsurance(input);
    const fieldErrors = validateCreateVehicleInsurance(value);
    if (Object.keys(fieldErrors).length) return { success: false, error: { type: "VALIDATION_ERROR", fieldErrors } };
    if (!await this.vehicles.vehicleExists(value.vehicleId)) return { success: false, error: { type: "VEHICLE_NOT_FOUND" } };
    try {
      const created = await this.writer.create(value);
      return { success: true, vehicleInsuranceId: created.vehicleInsuranceId };
    } catch (error) {
      if (error instanceof InsuranceVehicleNotFoundError) return { success: false, error: { type: "VEHICLE_NOT_FOUND" } };
      throw error;
    }
  }
}
