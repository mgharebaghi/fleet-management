export type InventoryUnit = { id: number; name: string; symbol: string | null };
export type PartCategory = { id: number; name: string; isActive: boolean };
export type Warehouse = { id: number; code: string; name: string; location: string | null; isActive: boolean };

export type InventoryReferenceField = "id" | "name" | "symbol" | "code" | "location" | "isActive";
export type InventoryReferenceValidationCode = "REQUIRED" | "TOO_LONG" | "INVALID_ID" | "INVALID_BOOLEAN";
export type InventoryReferenceFailure =
  | { type: "VALIDATION_ERROR"; fields: Partial<Record<InventoryReferenceField, InventoryReferenceValidationCode>> }
  | { type: "DUPLICATE_NAME" | "DUPLICATE_CODE" | "NOT_FOUND" | "UNIT_IN_USE" | "CATEGORY_IN_USE" | "WAREHOUSE_IN_USE" };
export type InventoryReferenceResult<T> = { success: true; value: T } | { success: false; error: InventoryReferenceFailure };

export type SaveInventoryUnit = { id: number | null; name: string; symbol: string | null };
export type SavePartCategory = { id: number | null; name: string; isActive: boolean };
export type SaveWarehouse = { id: number | null; code: string; name: string; location: string | null; isActive: boolean };
export type WarehouseSearch = { search: string; active: "active" | "inactive" | "all"; page: number };
export type WarehouseListItem = Warehouse & { hasStockHistory: boolean };
export type WarehouseSearchResult = { warehouses: WarehouseListItem[]; totalCount: number };
