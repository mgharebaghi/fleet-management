import type { VehicleInsuranceSummary } from "../vehicle-insurance";
import type { VehicleInsuranceReader } from "../ports/vehicle-insurance-reader";

export class GetVehicleInsurance {
  constructor(private readonly reader: VehicleInsuranceReader) {}

  async execute(vehicleInsuranceId: string): Promise<VehicleInsuranceSummary | null> {
    return this.reader.findById(vehicleInsuranceId);
  }
}
