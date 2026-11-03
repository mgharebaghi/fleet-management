import { normalizePersianSearchText } from "../../../../shared/text/persian-text";
import type { InventoryReferenceRepository } from "./inventory-reference-repository";
import type { WarehouseSearch } from "./inventory-reference-records";

export class ReadInventoryReferences {
  constructor(private readonly repository: InventoryReferenceRepository) {}
  units() { return this.repository.units(); }
  categories() { return this.repository.categories(); }
  warehouse(id: number) {
    if (!Number.isInteger(id) || id <= 0 || id > 2_147_483_647) return Promise.resolve(null);
    return this.repository.warehouse(id);
  }
  warehouses(criteria: WarehouseSearch) {
    return this.repository.warehouses({
      search: normalizePersianSearchText(criteria.search.trim()),
      active: criteria.active === "all" || criteria.active === "inactive" ? criteria.active : "active",
      page: Number.isSafeInteger(criteria.page) && criteria.page > 0 ? Math.min(criteria.page, 1_000_000) : 1,
    });
  }
}
