export type DeleteCatalogEntryActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | { status: "not_found" }
  | { status: "in_use" };

export const initialDeleteCatalogEntryActionState: DeleteCatalogEntryActionState =
  { status: "idle" };
