import type { VehicleSearchCriteria, VehicleSearchResult } from "../vehicle";
export interface VehicleReader {
  search(criteria: VehicleSearchCriteria): Promise<VehicleSearchResult>;
}
