import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SearchableSelect } from "./searchable-select";
import type { SearchableSelectOption } from "./searchable-select-options";

const options: SearchableSelectOption[] = [
  { value: "1", label: "پراید صبا — ۱۲ الف ۳۴۵", searchText: "پراید صبا ۱۲ الف ۳۴۵", content: <span>پراید صبا</span> },
  { value: "2", label: "سمند LX — ۶۵ ب ۹۸۷ (غیرفعال)", searchText: "سمند LX ۶۵ ب ۹۸۷", content: <span>سمند LX (غیرفعال)</span>, disabled: false },
];

function render(props: Partial<Parameters<typeof SearchableSelect>[0]> = {}) {
  return renderToStaticMarkup(
    <SearchableSelect name="vehicleId" label="خودرو" options={options} {...props} />,
  );
}

describe("SearchableSelect", () => {
  it("submits the selected option's value through a hidden field", () => {
    const markup = render({ defaultValue: "2" });

    expect(markup).toContain('type="hidden"');
    expect(markup).toContain('name="vehicleId"');
    expect(markup).toContain('value="2"');
  });

  it("shows a placeholder while nothing is selected", () => {
    const markup = render({ placeholder: "انتخاب خودرو" });

    expect(markup).toContain("انتخاب خودرو");
    expect(markup).toContain('value=""');
  });

  it("shows the matching option's rich content once a value is selected", () => {
    const markup = render({ defaultValue: "2" });

    expect(markup).toContain("سمند LX (غیرفعال)");
  });

  it("prefers a compact triggerContent over the option's rich content once selected", () => {
    const compactOptions: SearchableSelectOption[] = [
      { value: "1", label: "پراید", searchText: "پراید", content: <span>Rich Row</span>, triggerContent: <span>Compact Row</span> },
    ];
    const markup = renderToStaticMarkup(
      <SearchableSelect name="vehicleId" label="خودرو" options={compactOptions} defaultValue="1" />,
    );

    expect(markup).toContain("Compact Row");
    expect(markup).not.toContain("Rich Row");
  });

  it("opens from a collapsed, accessible trigger", () => {
    const markup = render();

    expect(markup).toContain('aria-haspopup="listbox"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('type="button"');
    // Closed by default: no listbox/panel markup should be present yet.
    expect(markup).not.toContain('role="listbox"');
  });

  it("associates a field error without an unsupported aria-invalid button", () => {
    const markup = render({ invalid: true, describedBy: "vehicleId-error" });

    expect(markup).toContain('aria-describedby="vehicleId-error"');
    expect(markup).toContain("data-invalid");
  });

  it("disables the trigger with the rest of a submitting form", () => {
    expect(render({ disabled: true })).toContain("disabled");
  });

  it("marks the field required through the shared label", () => {
    const markup = render({ required: true });
    const withoutRequired = render();

    expect(markup).toContain(">*<");
    expect(withoutRequired).not.toContain(">*<");
  });
});
