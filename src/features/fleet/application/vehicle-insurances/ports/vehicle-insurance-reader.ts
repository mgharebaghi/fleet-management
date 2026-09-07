import type { VehicleInsuranceSearchCriteria, VehicleInsuranceSearchResult, VehicleInsuranceSummary } from "../vehicle-insurance";

export interface VehicleInsuranceReader {
  search(criteria: VehicleInsuranceSearchCriteria): Promise<VehicleInsuranceSearchResult>;
  findById(vehicleInsuranceId: string): Promise<VehicleInsuranceSummary | null>;
}
