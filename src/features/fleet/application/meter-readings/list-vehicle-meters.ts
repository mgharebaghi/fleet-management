import type { VehicleMeterRepository } from "./vehicle-meter-repository";
import { normalizePersianSearchText } from "../../../../shared/text/persian-text";
const validId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2147483647;

export class ListVehicleMeters {
  constructor(private readonly repository: VehicleMeterRepository) {}
  execute(vehicleId: number, criteria: { search: string; page: number }) {
    if (!validId(vehicleId)) return Promise.resolve({ rows: [], totalCount: 0 });
    return this.repository.list(vehicleId, { search: normalizePersianSearchText(criteria.search.trim()).replace(/[٬,]/g, ""), page: Number.isSafeInteger(criteria.page) && criteria.page > 0 ? Math.min(criteria.page, 1000000) : 1 });
  }
}
