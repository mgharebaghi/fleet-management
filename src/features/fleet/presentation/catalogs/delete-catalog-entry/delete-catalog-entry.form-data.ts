export type ParseDeleteCatalogEntryFormDataResult =
  | { success: true; id: number }
  | { success: false };

export function parseDeleteCatalogEntryFormData(
  formData: FormData,
): ParseDeleteCatalogEntryFormDataResult {
  const idValue = formData.get("id");

  if (typeof idValue !== "string") {
    return { success: false };
  }

  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) {
    return { success: false };
  }

  return { success: true, id };
}
