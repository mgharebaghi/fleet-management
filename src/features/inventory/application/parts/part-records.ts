export type PartInput = {
  id: number | null; code: string; name: string; unitId: number; categoryId: number | null;
  partNumber: string | null; manufacturer: string | null;
  minStock: string | null; maxStock: string | null; reorderPoint: string | null; isActive: boolean;
};
export type PartRecord = Omit<PartInput, "id"> & {
  id: number; unitName: string; categoryName: string | null; categoryIsActive: boolean | null;
  isUsed: boolean; compatibleModels: Array<{ id: number; name: string; description: string | null }>;
};
export type PartSearch = { search: string; active: "active" | "inactive" | "all"; page: number };
export type PartFailure = { type: "VALIDATION_ERROR"; fields: Partial<Record<keyof PartInput, "REQUIRED" | "TOO_LONG" | "INVALID" >> }
  | { type: "DUPLICATE_CODE" | "NOT_FOUND" | "UNIT_NOT_FOUND" | "CATEGORY_UNAVAILABLE" | "UNIT_IN_USE" | "PART_IN_USE" };
export type PartResult = { success: true; id: number } | { success: false; error: PartFailure };
