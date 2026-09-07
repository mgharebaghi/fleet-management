import type { VehicleDetail, VehicleSearchCriteria, VehicleSearchResult } from "../vehicle";
export interface VehicleReader {
  search(criteria: VehicleSearchCriteria): Promise<VehicleSearchResult>;
  findById(vehicleId: number): Promise<VehicleDetail | null>;
}
