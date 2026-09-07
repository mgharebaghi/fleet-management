export type DeleteCatalogEntryError = { type: "NOT_FOUND" } | { type: "IN_USE" };

export type DeleteCatalogEntryResult =
  | { success: true }
  | { success: false; error: DeleteCatalogEntryError };
