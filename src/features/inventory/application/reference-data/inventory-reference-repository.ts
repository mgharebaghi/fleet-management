import type {
  InventoryUnit, PartCategory, Warehouse, SaveInventoryUnit, SavePartCategory,
  SaveWarehouse, WarehouseSearch, WarehouseSearchResult,
} from "./inventory-reference-records";

export class InventoryReferenceNotFoundError extends Error {}
export class InventoryUnitInUseError extends Error {}
export class InventoryCategoryInUseError extends Error {}
export class InventoryWarehouseInUseError extends Error {}

export interface InventoryReferenceWriteSession {
  unit(id: number): Promise<InventoryUnit | null>;
  unitNameExists(name: string, excludingId: number | null): Promise<boolean>;
  saveUnit(input: SaveInventoryUnit): Promise<InventoryUnit>;
  unitIsUsed(id: number): Promise<boolean>;
  deleteUnit(id: number): Promise<void>;
  category(id: number): Promise<PartCategory | null>;
  categoryIsUsed(id: number): Promise<boolean>;
  deleteCategory(id: number): Promise<void>;
  categoryNameExists(name: string, excludingId: number | null): Promise<boolean>;
  saveCategory(input: SavePartCategory): Promise<PartCategory>;
  warehouse(id: number): Promise<Warehouse | null>;
  warehouseIsUsed(id: number): Promise<boolean>;
  deleteWarehouse(id: number): Promise<void>;
  setWarehouseActive(id: number, isActive: boolean): Promise<Warehouse>;
  warehouseCodeExists(code: string, excludingId: number | null): Promise<boolean>;
  saveWarehouse(input: SaveWarehouse): Promise<Warehouse>;
}

export interface InventoryReferenceRepository {
  atomic<T>(work: (session: InventoryReferenceWriteSession) => Promise<T>): Promise<T>;
  units(): Promise<InventoryUnit[]>;
  categories(): Promise<PartCategory[]>;
  warehouse(id: number): Promise<Warehouse | null>;
  warehouses(criteria: WarehouseSearch): Promise<WarehouseSearchResult>;
}
