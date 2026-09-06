import { normalizeVehicleSearchText } from "../../vehicles/vehicle-text";
import type { VehicleInsuranceReader } from "../ports/vehicle-insurance-reader";
import type { VehicleInsuranceSearchCriteria } from "../vehicle-insurance";

export const INSURANCE_PAGE_SIZE = 20;
export const MAX_INSURANCE_PAGE = 21474836;
const positive = (value: number | undefined, fallback: number) => Number.isSafeInteger(value) && value! > 0 ? value! : fallback;

export class ListVehicleInsurances {
  constructor(private readonly reader: VehicleInsuranceReader) {}

  execute(input: Partial<VehicleInsuranceSearchCriteria> = {}) {
    return this.reader.search({
      search: input.search?.trim() ? normalizeVehicleSearchText(input.search.trim()) : null,
      isActive: input.isActive === null || input.isActive === false ? input.isActive : true,
      pageNumber: Math.min(positive(input.pageNumber, 1), MAX_INSURANCE_PAGE),
      pageSize: Math.min(positive(input.pageSize, INSURANCE_PAGE_SIZE), 100),
    });
  }
}
