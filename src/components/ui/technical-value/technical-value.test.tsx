import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TechnicalValue } from "./technical-value";

describe("TechnicalValue", () => {
  it("renders its content isolated as left-to-right", () => {
    const markup = renderToStaticMarkup(
      <TechnicalValue>0012345679</TechnicalValue>,
    );

    expect(markup).toContain('dir="ltr"');
    expect(markup).toContain("0012345679");
  });
});
