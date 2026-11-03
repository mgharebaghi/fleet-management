import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DecimalInput, normalizeDecimalInput } from "./decimal-input";
describe("DecimalInput", () => {
  it("groups visible digits while submitting an exact ungrouped decimal", () => {
    const html = renderToStaticMarkup(<DecimalInput id="reading" name="reading" value="9999999999999999.99" onValueChange={() => {}} />);
    expect(html).toContain('name="reading"'); expect(html).toContain('value="9999999999999999.99"');
    expect(html).toContain('value="9,999,999,999,999,999.99"');
  });
  it("normalizes Persian numbers and grouping without making invalid negative values positive", () => {
    expect(normalizeDecimalInput("۱٬۲۳۴٫۵۶")).toBe("1234.56");
    expect(normalizeDecimalInput("-۱۲۳")).toBe("-123");
    expect(normalizeDecimalInput("1.2.3")).toBe("1.2.3");
  });
});
