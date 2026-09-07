import { normalizeCreateVehicleInsurance, validateCreateVehicleInsurance } from "../create-vehicle-insurance/create-vehicle-insurance.validation";
import type { InsuranceVehicleReader } from "../ports/insurance-vehicle-reader";
import {
  InsuranceVehicleNotFoundError,
  VehicleInsuranceNotFoundError,
  type VehicleInsuranceWriter,
} from "../ports/vehicle-insurance-writer";
import type { UpdateVehicleInsuranceInput, UpdateVehicleInsuranceResult } from "./update-vehicle-insurance.contract";

export class UpdateVehicleInsurance {
  constructor(private readonly writer: VehicleInsuranceWriter, private readonly vehicles: InsuranceVehicleReader) {}

  async execute(input: UpdateVehicleInsuranceInput): Promise<UpdateVehicleInsuranceResult> {
    const { vehicleInsuranceId, isActive, ...rest } = input;
    const value = normalizeCreateVehicleInsurance(rest);
    const fieldErrors = validateCreateVehicleInsurance(value);
    if (Object.keys(fieldErrors).length) {
      return { success: false, error: { type: "VALIDATION_ERROR", fieldErrors } };
    }
    if (!(await this.vehicles.vehicleExists(value.vehicleId))) {
      return { success: false, error: { type: "VEHICLE_NOT_FOUND" } };
    }

    try {
      await this.writer.update(vehicleInsuranceId, { ...value, isActive });
      return { success: true };
    } catch (error) {
      if (error instanceof InsuranceVehicleNotFoundError) {
        return { success: false, error: { type: "VEHICLE_NOT_FOUND" } };
      }
      if (error instanceof VehicleInsuranceNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
