import type {
  CreateCatalogEntryInput,
  CreateCatalogEntryValidationError,
  CreateCatalogEntryValidationErrorCode,
} from "./create-catalog-entry.contract";

export function normalizeCreateCatalogEntryInput(
  input: CreateCatalogEntryInput,
): CreateCatalogEntryInput {
  return { name: input.name.trim() };
}

export function validateCreateCatalogEntryInput(
  input: CreateCatalogEntryInput,
  maximumNameLength: number,
): CreateCatalogEntryValidationError | null {
  const errors: CreateCatalogEntryValidationErrorCode[] = [];

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
