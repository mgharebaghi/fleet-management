import type { VehicleReader } from "../ports/vehicle-reader";
import type { VehicleSearchCriteria } from "../vehicle";
import { normalizeVehicleSearchText } from "../vehicle-text";
export type ListVehiclesInput = Partial<VehicleSearchCriteria>;
const positive = (value: number | undefined, fallback: number) => Number.isSafeInteger(value) && value! > 0 ? value! : fallback;
export class ListVehicles {
  constructor(private readonly reader: VehicleReader) {}
  execute(input: ListVehiclesInput = {}) {
    return this.reader.search({
      search: input.search?.trim() ? normalizeVehicleSearchText(input.search.trim()) : null,
      pageNumber: Math.min(positive(input.pageNumber, 1), 21474836),
      pageSize: Math.min(positive(input.pageSize, 20), 100),
      isActive: input.isActive === undefined ? true : input.isActive,
      vehicleStatusId: input.vehicleStatusId && Number.isInteger(input.vehicleStatusId) && input.vehicleStatusId > 0 && input.vehicleStatusId <= 2147483647 ? input.vehicleStatusId : null,
    });
  }
}
