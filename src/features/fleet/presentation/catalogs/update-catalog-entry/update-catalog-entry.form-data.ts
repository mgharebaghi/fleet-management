import type { UpdateCatalogEntryInput } from "../../../application/catalogs/update-catalog-entry/update-catalog-entry.contract";

export type ParseUpdateCatalogEntryFormDataResult =
  | { success: true; input: UpdateCatalogEntryInput }
  | { success: false };

/**
 * The "supportsActive" hidden field disambiguates two situations FormData
 * cannot tell apart on its own: an unchecked checkbox and a checkbox that
 * was never rendered because this catalog (VehicleStatus) has no IsActive
 * column at all.
 */
export function parseUpdateCatalogEntryFormData(
  formData: FormData,
): ParseUpdateCatalogEntryFormDataResult {
  const idValue = formData.get("id");
  const name = formData.get("name");
  const supportsActive = formData.get("supportsActive");

  if (typeof idValue !== "string" || typeof name !== "string") {
    return { success: false };
  }

  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) {
    return { success: false };
  }

  const isActive =
    supportsActive === "true" ? formData.get("isActive") === "on" : undefined;

  return { success: true, input: { id, name, isActive } };
}
