import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  type CatalogEntryWriter,
} from "../ports/catalog-entry-writer";
import type { DeleteCatalogEntryResult } from "./delete-catalog-entry.contract";

export class DeleteCatalogEntry<TEntry> {
  constructor(private readonly catalogEntryWriter: CatalogEntryWriter<TEntry>) {}

  async execute(id: number): Promise<DeleteCatalogEntryResult> {
    try {
      await this.catalogEntryWriter.remove(id);
      return { success: true };
    } catch (error) {
      if (error instanceof CatalogEntryInUseError) {
        return { success: false, error: { type: "IN_USE" } };
      }
      if (error instanceof CatalogEntryNotFoundError) {
        return { success: false, error: { type: "NOT_FOUND" } };
      }
      throw error;
    }
  }
}
