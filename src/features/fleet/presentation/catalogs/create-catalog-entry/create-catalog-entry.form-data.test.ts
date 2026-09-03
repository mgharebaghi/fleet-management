import { describe, expect, it } from "vitest";

import { parseCreateCatalogEntryFormData } from "./create-catalog-entry.form-data";

describe("parseCreateCatalogEntryFormData", () => {
  it("reads the name field", () => {
    const formData = new FormData();
    formData.set("name", "Volvo");

    expect(parseCreateCatalogEntryFormData(formData)).toEqual({
      success: true,
      input: { name: "Volvo" },
    });
  });

  it("fails when the name field is absent", () => {
    expect(parseCreateCatalogEntryFormData(new FormData())).toEqual({
      success: false,
    });
  });

  it("fails when the name field is not a string", () => {
    const formData = new FormData();
    formData.set("name", new Blob(["Volvo"]));

    expect(parseCreateCatalogEntryFormData(formData)).toEqual({
      success: false,
    });
  });
});
