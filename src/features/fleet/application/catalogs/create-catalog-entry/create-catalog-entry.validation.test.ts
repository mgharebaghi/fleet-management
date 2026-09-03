import { describe, expect, it } from "vitest";

import {
  normalizeCreateCatalogEntryInput,
  validateCreateCatalogEntryInput,
} from "./create-catalog-entry.validation";

describe("normalizeCreateCatalogEntryInput", () => {
  it("trims the name", () => {
    expect(normalizeCreateCatalogEntryInput({ name: "  Volvo  " })).toEqual({
      name: "Volvo",
    });
  });
});

describe("validateCreateCatalogEntryInput", () => {
  it("returns null for a valid name", () => {
    expect(validateCreateCatalogEntryInput({ name: "Volvo" }, 100)).toBeNull();
  });

  it("returns REQUIRED for an empty name", () => {
    expect(validateCreateCatalogEntryInput({ name: "" }, 100)).toEqual({
      type: "VALIDATION_ERROR",
      fieldErrors: { name: ["REQUIRED"] },
    });
  });

  it("returns TOO_LONG when the name exceeds the maximum length", () => {
    const name = "a".repeat(51);

    expect(validateCreateCatalogEntryInput({ name }, 50)).toEqual({
      type: "VALIDATION_ERROR",
      fieldErrors: { name: ["TOO_LONG"] },
    });
  });

  it("accepts a name at exactly the maximum length", () => {
    const name = "a".repeat(50);

    expect(validateCreateCatalogEntryInput({ name }, 50)).toBeNull();
  });
});
