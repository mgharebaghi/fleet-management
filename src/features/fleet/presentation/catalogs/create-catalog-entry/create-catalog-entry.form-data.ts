import type { CreateCatalogEntryInput } from "../../../application/catalogs/create-catalog-entry/create-catalog-entry.contract";

export type ParseCreateCatalogEntryFormDataResult =
  | { success: true; input: CreateCatalogEntryInput }
  | { success: false };

export function parseCreateCatalogEntryFormData(
  formData: FormData,
): ParseCreateCatalogEntryFormDataResult {
  const name = formData.get("name");

  if (typeof name !== "string") {
    return { success: false };
  }

  return { success: true, input: { name } };
}
