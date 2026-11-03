export const stockMovementTypes = ["Opening", "Receipt", "Issue", "Return", "AdjustmentIn", "AdjustmentOut"] as const;
export type StockMovementType = typeof stockMovementTypes[number];
export type StockMovementInput = { warehouseId: number; partId: number; type: string; quantity: string; unitPrice: string | null; description: string | null };
export type StockFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<keyof StockMovementInput, "REQUIRED" | "INVALID" | "TOO_LONG">> }
  | { type: "REFERENCE_UNAVAILABLE" | "OPENING_EXISTS" | "INSUFFICIENT_STOCK" | "INVALID_LEDGER" };
export type StockWriteResult = { success: true; id: string } | { success: false; error: StockFailure };
export type StockSearch = { search: string; warehouseId: number | null; partId: number | null; type: string; from: string; to: string; page: number };
export type StockBalance = { warehouseId: number | null; warehouseCode: string | null; warehouseName: string | null; warehouseActive: boolean | null; partId: number; partCode: string; partName: string; partActive: boolean; unitName: string; balance: string | null; totalBalance: string | null; minStock: string | null; maxStock: string | null; reorderPoint: string | null };
export type StockMovement = { id: string; warehouseId: number; warehouseName: string; warehouseCode: string; partId: number; partCode: string; partName: string; unitName: string; type: string; quantity: string; unitPrice: string | null; description: string | null; date: string };
export type StockReferences = { warehouses: Array<{ id: number; code: string; name: string; active: boolean }>; parts: Array<{ id: number; code: string; name: string; unitName: string; active: boolean }> };
