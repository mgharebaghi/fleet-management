import type { CatalogEntryReader } from "../ports/catalog-entry-reader";

export class ListCatalogEntries<TEntry> {
  constructor(private readonly catalogEntryReader: CatalogEntryReader<TEntry>) {}

  async execute(): Promise<TEntry[]> {
    return this.catalogEntryReader.list();
  }
}
