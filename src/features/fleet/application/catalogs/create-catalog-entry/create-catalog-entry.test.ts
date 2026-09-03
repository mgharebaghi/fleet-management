import { describe, expect, it } from "vitest";

import type { CatalogEntry } from "../catalog-entry";
import type { CatalogEntryWriter } from "../ports/catalog-entry-writer";
import { CreateCatalogEntry } from "./create-catalog-entry";

const MAX_NAME_LENGTH = 100;

class CatalogEntryWriterFake implements CatalogEntryWriter<CatalogEntry> {
  readonly existingNames = new Set<string>();
  readonly checkedNames: string[] = [];
  readonly createdNames: string[] = [];
  private nextId = 1;

  async existsByName(name: string): Promise<boolean> {
    this.checkedNames.push(name);
    return this.existingNames.has(name);
  }

  async create(name: string): Promise<CatalogEntry> {
    this.createdNames.push(name);
    return { id: this.nextId++, name };
  }
}

describe("CreateCatalogEntry", () => {
  it("returns a validation error without checking for duplicates or creating an entry", async () => {
    const writer = new CatalogEntryWriterFake();
    const createCatalogEntry = new CreateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await createCatalogEntry.execute({ name: "   " });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { name: ["REQUIRED"] } },
    });
    expect(writer.checkedNames).toEqual([]);
    expect(writer.createdNames).toEqual([]);
  });

  it("trims the name before checking for duplicates and creating an entry", async () => {
    const writer = new CatalogEntryWriterFake();
    const createCatalogEntry = new CreateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await createCatalogEntry.execute({ name: "  Volvo  " });

    expect(result).toEqual({
      success: true,
      entry: { id: 1, name: "Volvo" },
    });
    expect(writer.checkedNames).toEqual(["Volvo"]);
    expect(writer.createdNames).toEqual(["Volvo"]);
  });

  it("returns a duplicate error without creating an entry", async () => {
    const writer = new CatalogEntryWriterFake();
    writer.existingNames.add("Volvo");
    const createCatalogEntry = new CreateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await createCatalogEntry.execute({ name: "Volvo" });

    expect(result).toEqual({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    });
    expect(writer.createdNames).toEqual([]);
  });

  it("checks duplicates against the trimmed name", async () => {
    const writer = new CatalogEntryWriterFake();
    writer.existingNames.add("Volvo");
    const createCatalogEntry = new CreateCatalogEntry(writer, MAX_NAME_LENGTH);

    const result = await createCatalogEntry.execute({ name: "  Volvo  " });

    expect(result).toEqual({
      success: false,
      error: { type: "NAME_ALREADY_EXISTS" },
    });
  });

  it("enforces the configured maximum name length", async () => {
    const writer = new CatalogEntryWriterFake();
    const createCatalogEntry = new CreateCatalogEntry(writer, 5);

    const result = await createCatalogEntry.execute({ name: "Volvo Trucks" });

    expect(result).toEqual({
      success: false,
      error: { type: "VALIDATION_ERROR", fieldErrors: { name: ["TOO_LONG"] } },
    });
    expect(writer.checkedNames).toEqual([]);
  });
});
