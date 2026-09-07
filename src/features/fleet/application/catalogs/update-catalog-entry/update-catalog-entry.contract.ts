export type UpdateCatalogEntryInput = {
  id: number;
  name: string;
  /** Omitted for catalogs (like VehicleStatus) that have no IsActive column. */
  isActive?: boolean;
};

export type UpdateCatalogEntryValidationErrorCode = "REQUIRED" | "TOO_LONG";

export type UpdateCatalogEntryValidationError = {
  type: "VALIDATION_ERROR";
  fieldErrors: {
    name: UpdateCatalogEntryValidationErrorCode[];
  };
};

export type UpdateCatalogEntryError =
  | UpdateCatalogEntryValidationError
  | { type: "NAME_ALREADY_EXISTS" }
  | { type: "NOT_FOUND" };

export type UpdateCatalogEntryResult<TEntry> =
  | { success: true; entry: TEntry }
  | { success: false; error: UpdateCatalogEntryError };
