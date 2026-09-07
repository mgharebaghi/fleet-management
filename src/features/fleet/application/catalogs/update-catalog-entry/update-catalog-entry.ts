import {
  CatalogEntryNotFoundError,
  type CatalogEntryWriter,
} from "../ports/catalog-entry-writer";
import type {
  UpdateCatalogEntryInput,
  UpdateCatalogEntryResult,
} from "./update-catalog-entry.contract";
import {
  normalizeUpdateCatalogEntryInput,
  validateUpdateCatalogEntryInput,
} from "./update-catalog-entry.validation";

export class UpdateCatalogEntry<TEntry> {
  constructor(
    private readonly catalogEntryWriter: CatalogEntryWriter<TEntry>,
    private readonly maximumNameLength: number,
  ) {}

  async execute(
    input: UpdateCatalogEntryInput,
  ): Promise<UpdateCatalogEntryResult<TEntry>> {
    const normalizedInput = normalizeUpdateCatalogEntryInput(input);
    const validationError = validateUpdateCatalogEntryInput(
      normalizedInput,
      this.maximumNameLength,
    );
    if (validationError !== null) {
      return { success: false, error: validationError };
    }

    if (
      await this.catalogEntryWriter.existsByName(
        normalizedInput.name,
        normalizedInput.id,
      )
    ) {
      return { success: false, error: { type: "NAME_ALREADY_EXISTS" } };
    }

    try {
      const entry = await this.catalogEntryWriter.update(normalizedInput.id, {
        name: normalizedInput.name,
        isActive: normalizedInput.isActive,
      });

      return { success: true, entry };
    } catch (error) {
      if (error instanceof CatalogEntryNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
