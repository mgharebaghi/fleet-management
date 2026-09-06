import type { InsuranceVehicleReader } from "../ports/insurance-vehicle-reader";

export class ListInsuranceVehicles {
  constructor(private readonly vehicles: InsuranceVehicleReader) {}
  execute() { return this.vehicles.listVehicles(); }
}
