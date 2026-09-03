import { describe, expect, it } from "vitest";

import type { CatalogEntry } from "../catalog-entry";
import type { CatalogEntryReader } from "../ports/catalog-entry-reader";
import { ListCatalogEntries } from "./list-catalog-entries";

class CatalogEntryReaderFake implements CatalogEntryReader<CatalogEntry> {
  constructor(private readonly entries: CatalogEntry[]) {}

  async list(): Promise<CatalogEntry[]> {
    return this.entries;
  }
}

describe("ListCatalogEntries", () => {
  it("returns the entries from the reader", async () => {
    const entries: CatalogEntry[] = [
      { id: 1, name: "Volvo" },
      { id: 2, name: "Scania" },
    ];
    const listCatalogEntries = new ListCatalogEntries(
      new CatalogEntryReaderFake(entries),
    );

    const result = await listCatalogEntries.execute();

    expect(result).toBe(entries);
  });
});
