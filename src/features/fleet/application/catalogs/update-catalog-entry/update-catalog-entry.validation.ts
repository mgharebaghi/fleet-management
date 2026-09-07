import type {
  UpdateCatalogEntryInput,
  UpdateCatalogEntryValidationError,
  UpdateCatalogEntryValidationErrorCode,
} from "./update-catalog-entry.contract";

export function normalizeUpdateCatalogEntryInput(
  input: UpdateCatalogEntryInput,
): UpdateCatalogEntryInput {
  return { ...input, name: input.name.trim() };
}

export function validateUpdateCatalogEntryInput(
  input: UpdateCatalogEntryInput,
  maximumNameLength: number,
): UpdateCatalogEntryValidationError | null {
  const errors: UpdateCatalogEntryValidationErrorCode[] = [];

  if (input.name.length === 0) {
    errors.push("REQUIRED");
  } else if (input.name.length > maximumNameLength) {
    errors.push("TOO_LONG");
  }

  if (errors.length === 0) {
    return null;
  }

  return { type: "VALIDATION_ERROR", fieldErrors: { name: errors } };
}
