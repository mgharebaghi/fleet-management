import { describe, expect, it } from "vitest";

import type { CatalogEntry } from "../catalog-entry";
import {
  CatalogEntryInUseError,
  CatalogEntryNotFoundError,
  type CatalogEntryChanges,
  type CatalogEntryWriter,
} from "../ports/catalog-entry-writer";
import { DeleteCatalogEntry } from "./delete-catalog-entry";

class CatalogEntryWriterFake implements CatalogEntryWriter<CatalogEntry> {
  readonly removedIds: number[] = [];
  behavior: "ok" | "in_use" | "not_found" = "ok";

  async existsByName(): Promise<boolean> {
    return false;
  }

  async create(name: string): Promise<CatalogEntry> {
    return { id: 1, name };
  }

  async update(id: number, changes: CatalogEntryChanges): Promise<CatalogEntry> {
    return { id, name: changes.name };
  }

  async remove(id: number): Promise<void> {
    this.removedIds.push(id);
    if (this.behavior === "in_use") {
      throw new CatalogEntryInUseError();
    }
    if (this.behavior === "not_found") {
      throw new CatalogEntryNotFoundError();
    }
  }
}

describe("DeleteCatalogEntry", () => {
  it("removes the entry through the writer", async () => {
    const writer = new CatalogEntryWriterFake();
    const deleteCatalogEntry = new DeleteCatalogEntry(writer);

    const result = await deleteCatalogEntry.execute(7);

    expect(result).toEqual({ success: true });
    expect(writer.removedIds).toEqual([7]);
  });

  it("maps a foreign-key-in-use failure to an IN_USE error instead of throwing", async () => {
    const writer = new CatalogEntryWriterFake();
    writer.behavior = "in_use";
    const deleteCatalogEntry = new DeleteCatalogEntry(writer);

    const result = await deleteCatalogEntry.execute(7);

    expect(result).toEqual({ success: false, error: { type: "IN_USE" } });
  });

  it("maps a missing entry to a NOT_FOUND error instead of throwing", async () => {
    const writer = new CatalogEntryWriterFake();
    writer.behavior = "not_found";
    const deleteCatalogEntry = new DeleteCatalogEntry(writer);

    const result = await deleteCatalogEntry.execute(7);

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });

  it("propagates an unexpected writer error", async () => {
    const writer = new CatalogEntryWriterFake();
    writer.remove = async () => {
      throw new Error("unexpected");
    };
    const deleteCatalogEntry = new DeleteCatalogEntry(writer);

    await expect(deleteCatalogEntry.execute(7)).rejects.toThrow("unexpected");
  });
});
