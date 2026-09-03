import type { CreateCatalogEntryValidationErrorCode } from "../../../application/catalogs/create-catalog-entry/create-catalog-entry.contract";

export type CreateCatalogEntryActionState =
  | { status: "idle" }
  | { status: "invalid_form" }
  | {
      status: "validation_error";
      fieldErrors: { name: CreateCatalogEntryValidationErrorCode[] };
    }
  | { status: "name_already_exists" };

export const initialCreateCatalogEntryActionState: CreateCatalogEntryActionState =
  { status: "idle" };
