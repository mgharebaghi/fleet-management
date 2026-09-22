import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { filterSearchableOptions } from "../searchable-select/searchable-select-options";
import { SearchableCombobox } from "./searchable-combobox";

const suggestions = ["ماموریت اداری", "سفر شخصی", "سفر سیاحتی"] as const;

function render(props: Partial<Parameters<typeof SearchableCombobox>[0]> = {}) {
  return renderToStaticMarkup(
    <SearchableCombobox
      name="purpose"
      label="هدف سفر"
      suggestions={suggestions}
      {...props}
    />,
  );
}

describe("SearchableCombobox", () => {
  it("starts from the provided text and submits that text", () => {
    const markup = render({ defaultValue: "ماموریت اداری" });

    expect(markup).toContain('name="purpose"');
    expect(markup).toContain('value="ماموریت اداری"');
    expect(markup).toContain('role="combobox"');
    expect(markup).not.toContain("<datalist");
    expect(markup).not.toContain('role="listbox"');
  });

  it("keeps a custom restored value that is not one of the suggestions", () => {
    const markup = render({ defaultValue: "جلسه با پیمانکار پروژه" });

    expect(markup).toContain('value="جلسه با پیمانکار پروژه"');
  });

  it("filters suggestions while still allowing text that matches nothing", () => {
    const options = suggestions.map((suggestion) => ({
      value: suggestion,
      label: suggestion,
      searchText: suggestion,
      content: suggestion,
    }));

    expect(filterSearchableOptions(options, "سیاحتی").map((option) => option.value)).toEqual([
      "سفر سیاحتی",
    ]);
    expect(filterSearchableOptions(options, "پیمانکار")).toEqual([]);
  });

  it("disables the field without opening a native select", () => {
    const markup = render({ disabled: true, defaultValue: "سفر شخصی" });

    expect(markup).toContain("disabled");
    expect(markup).not.toContain("<select");
  });

  it("shows a controlled value that is not one of the suggestions", () => {
    const markup = render({ value: "کارگاه موقت", onValueChange: () => {} });

    expect(markup).toContain('value="کارگاه موقت"');
    expect(markup).not.toContain("<select");
  });
});
