import { describe, expect, it } from "vitest";

import { filterSearchableOptions, type SearchableSelectOption } from "./searchable-select-options";

function option(overrides: Partial<SearchableSelectOption>): SearchableSelectOption {
  return { value: "1", label: "Option", searchText: "Option", content: null, ...overrides };
}

describe("filterSearchableOptions", () => {
  it("returns every option for a blank query", () => {
    const options = [option({ value: "1" }), option({ value: "2" })];
    expect(filterSearchableOptions(options, "  ")).toEqual(options);
  });

  it("matches a substring of the search text, case-sensitively by default", () => {
    const pride = option({ value: "1", searchText: "پراید 111 پلاک ۱۲۳" });
    const samand = option({ value: "2", searchText: "سمند LX پلاک ۴۵۶" });
    expect(filterSearchableOptions([pride, samand], "سمند")).toEqual([samand]);
    expect(filterSearchableOptions([pride, samand], "پلاک")).toEqual([pride, samand]);
  });

  it("applies the caller's normalizeQuery to both the query and each searchText", () => {
    const options = [option({ value: "1", searchText: "پلاک ۱۲۳" })];
    const toLatinDigits = (value: string) => value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
    expect(filterSearchableOptions(options, "123", toLatinDigits)).toEqual(options);
    expect(filterSearchableOptions(options, "۱۲۳", toLatinDigits)).toEqual(options);
  });

  it("excludes options that do not match", () => {
    const options = [option({ value: "1", searchText: "Alpha" })];
    expect(filterSearchableOptions(options, "Bravo")).toEqual([]);
  });
});
