export type CreateCatalogEntryInput = {
  name: string;
};

export type CreateCatalogEntryValidationErrorCode = "REQUIRED" | "TOO_LONG";

export type CreateCatalogEntryValidationError = {
  type: "VALIDATION_ERROR";
  fieldErrors: {
    name: CreateCatalogEntryValidationErrorCode[];
  };
};

export type CreateCatalogEntryError =
  | CreateCatalogEntryValidationError
  | { type: "NAME_ALREADY_EXISTS" };

export type CreateCatalogEntryResult<TEntry> =
  | { success: true; entry: TEntry }
  | { success: false; error: CreateCatalogEntryError };
