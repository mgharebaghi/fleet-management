import type { VehicleInsuranceSearchCriteria, VehicleInsuranceSearchResult } from "../vehicle-insurance";

export interface VehicleInsuranceReader {
  search(criteria: VehicleInsuranceSearchCriteria): Promise<VehicleInsuranceSearchResult>;
}
