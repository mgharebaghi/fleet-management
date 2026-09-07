import type { UpdateCatalogEntryValidationErrorCode } from "../../../application/catalogs/update-catalog-entry/update-catalog-entry.contract";

export type UpdateCatalogEntryActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | {
      status: "validation_error";
      fieldErrors: { name: UpdateCatalogEntryValidationErrorCode[] };
    }
  | { status: "name_already_exists" }
  | { status: "not_found" };

export const initialUpdateCatalogEntryActionState: UpdateCatalogEntryActionState =
  { status: "idle" };
