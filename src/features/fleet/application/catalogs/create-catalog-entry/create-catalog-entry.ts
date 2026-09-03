import type { CatalogEntryWriter } from "../ports/catalog-entry-writer";
import type {
  CreateCatalogEntryInput,
  CreateCatalogEntryResult,
} from "./create-catalog-entry.contract";
import {
  normalizeCreateCatalogEntryInput,
  validateCreateCatalogEntryInput,
} from "./create-catalog-entry.validation";

export class CreateCatalogEntry<TEntry> {
  constructor(
    private readonly catalogEntryWriter: CatalogEntryWriter<TEntry>,
    private readonly maximumNameLength: number,
  ) {}

  async execute(
    input: CreateCatalogEntryInput,
  ): Promise<CreateCatalogEntryResult<TEntry>> {
    const normalizedInput = normalizeCreateCatalogEntryInput(input);
    const validationError = validateCreateCatalogEntryInput(
      normalizedInput,
      this.maximumNameLength,
    );
    if (validationError !== null) {
      return { success: false, error: validationError };
    }

    if (await this.catalogEntryWriter.existsByName(normalizedInput.name)) {
      return { success: false, error: { type: "NAME_ALREADY_EXISTS" } };
    }

    const entry = await this.catalogEntryWriter.create(normalizedInput.name);

    return { success: true, entry };
  }
}
