import { describe, expect, it } from "vitest";

import type { CatalogEntry } from "../catalog-entry";
import {
  CatalogEntryNotFoundError,
  type CatalogEntryChanges,
  type CatalogEntryWriter,
} from "../ports/catalog-entry-writer";
import { UpdateCatalogEntry } from "./update-catalog-entry";

const MAX_NAME_LENGTH = 100;

class CatalogEntryWriterFake implements CatalogEntryWriter<CatalogEntry> {
  readonly entries = new Map<number, CatalogEntry>();
  readonly checkedNames: { name: string; excludeId: number | undefined }[] = [];
  readonly updatedIds: number[] = [];
  missingId: number | null = null;

  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    this.checkedNames.push({ name, excludeId });
    for (const entry of this.entries.values()) {
      if (entry.name === name && entry.id !== excludeId) {
        return true;
      }
    }
    return false;
  }

  async create(name: string): Promise<CatalogEntry> {
    const entry = { id: this.entries.size + 1, name };
    this.entries.set(entry.id, entry);
    return entry;
  }

  async update(id: number, changes: CatalogEntryChanges): Promise<CatalogEntry> {
    this.updatedIds.push(id);
    if (id === this.missingId) {
      throw new CatalogEntryNotFoundError();
    }
    const entry = { id, name: changes.name };
    this.entries.set(id, entry);
    return entry;
  }

  async remove(): Promise<void> {}
}

describe("UpdateCatalogEntry", () => {
  it("returns a validation error without checking duplicates or writing", async () => {
    const writer = new CatalogEntryWriterFake();
    const updateCatalogEntry = new UpdateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await updateCatalogEntry.execute({ id: 1, name: "   " });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { name: ["REQUIRED"] } },
    });
    expect(writer.checkedNames).toEqual([]);
    expect(writer.updatedIds).toEqual([]);
  });

  it("trims the name before checking for duplicates and writing", async () => {
    const writer = new CatalogEntryWriterFake();
    await writer.create("Volvo");
    const updateCatalogEntry = new UpdateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await updateCatalogEntry.execute({
      id: 1,
      name: "  Volvo XL  ",
    });

    expect(result).toEqual({ success: true, entry: { id: 1, name: "Volvo XL" } });
    expect(writer.checkedNames).toEqual([{ name: "Volvo XL", excludeId: 1 }]);
  });

  it("excludes the entry's own id from the duplicate check, so keeping the same name succeeds", async () => {
    const writer = new CatalogEntryWriterFake();
    await writer.create("Volvo");
    const updateCatalogEntry = new UpdateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await updateCatalogEntry.execute({ id: 1, name: "Volvo" });

    expect(result).toEqual({ success: true, entry: { id: 1, name: "Volvo" } });
  });

  it("returns a duplicate error when another entry already has the name", async () => {
    const writer = new CatalogEntryWriterFake();
    await writer.create("Volvo");
    await writer.create("Scania");
    const updateCatalogEntry = new UpdateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await updateCatalogEntry.execute({ id: 2, name: "Volvo" });

    expect(result).toEqual({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    });
    expect(writer.updatedIds).toEqual([]);
  });

  it("enforces the configured maximum name length", async () => {
    const writer = new CatalogEntryWriterFake();
    const updateCatalogEntry = new UpdateCatalogEntry(writer, 5);

    const result = await updateCatalogEntry.execute({
      id: 1,
      name: "Volvo Trucks",
    });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { name: ["TOO_LONG"] } },
    });
  });

  it("maps a write against a since-deleted entry to a not-found error", async () => {
    const writer = new CatalogEntryWriterFake();
    writer.missingId = 1;
    const updateCatalogEntry = new UpdateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await updateCatalogEntry.execute({ id: 1, name: "Volvo" });

    expect(result).toEqual({ success: false, error: { type: "NOT_FOUND" } });
  });

  it("propagates an unexpected writer error", async () => {
    const writer = new CatalogEntryWriterFake();
    writer.update = async () => {
      throw new Error("unexpected");
    };
    const updateCatalogEntry = new UpdateCatalogEntry(writer, MAX_NAME_LENGTH);

    await expect(
      updateCatalogEntry.execute({ id: 1, name: "Volvo" }),
    ).rejects.toThrow("unexpected");
  });
});
