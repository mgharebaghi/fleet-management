import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MoneyInput } from "./money-input";

function render(props: Partial<Parameters<typeof MoneyInput>[0]> = {}) {
  return renderToStaticMarkup(
    <MoneyInput
      id="purchasePrice"
      name="purchasePrice"
      label="قیمت خرید"
      {...props}
    />,
  );
}

describe("MoneyInput", () => {
  it("names the currency in the label rather than only a placeholder", () => {
    const markup = render();

    expect(markup).toContain("قیمت خرید");
    expect(markup).toContain("تومان");
    expect(markup).toContain('for="purchasePrice"');
    expect(markup).not.toContain("placeholder");
  });

  it("shows grouped digits while submitting the plain decimal", () => {
    const markup = render({ defaultValue: "12500000" });

    expect(markup).toContain('value="12,500,000"');
    expect(markup).toContain('type="hidden"');
    expect(markup).toContain('value="12500000"');
  });

  it("keeps decimals and full precision on a large amount", () => {
    const markup = render({ defaultValue: "9999999999999999.99" });

    expect(markup).toContain('value="9,999,999,999,999,999.99"');
    expect(markup).toContain('value="9999999999999999.99"');
  });

  it("strips grouping a user pasted before the Application sees it", () => {
    const markup = render({ defaultValue: "12,500,000" });

    expect(markup).toContain('value="12500000"');
  });

  it("keeps zero and an untouched optional field distinguishable", () => {
    expect(render({ defaultValue: "0" })).toContain('value="0"');
    expect(render()).toContain('value=""');
  });

  it("renders numbers left to right inside the RTL form", () => {
    expect(render()).toContain('dir="ltr"');
  });

  it("associates a field error with the amount input", () => {
    const markup = render({
      invalid: true,
      describedBy: "purchasePrice-error",
    });

    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="purchasePrice-error"');
  });
});
