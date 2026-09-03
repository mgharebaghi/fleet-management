export interface CatalogEntryWriter<TEntry> {
  existsByName(name: string): Promise<boolean>;
  create(name: string): Promise<TEntry>;
}
