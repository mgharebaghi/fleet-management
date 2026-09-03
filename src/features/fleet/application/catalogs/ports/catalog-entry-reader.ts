export interface CatalogEntryReader<TEntry> {
  list(): Promise<TEntry[]>;
}
